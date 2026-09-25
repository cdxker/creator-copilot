import { assess, withPangram, type Assessment, type RequestInput, type Score } from './detector';
import type { PangramResponse } from './background';
import { parseRowText } from './parse';

const DM_ROUTE = /^\/(messages|i\/chat)(\/|$)/;
const ROW_SELECTOR = '[data-testid="conversation"], a[href^="/messages/"], a[href^="/i/chat/"]';
const MESSAGE_SELECTOR = '[data-testid="messageEntry"]';
const BADGE_CLASS = 'xrs-badge';
// Pangram needs some text to work with; one-word openers are left to the heuristics.
const PANGRAM_MIN_WORDS = 12;

// Remember who sent each conversation so an opened thread can reuse the handle.
const senders = new Map<string, RequestInput>();
const pangramCache = new Map<string, Promise<PangramResponse>>();

function pangram(text: string) {
  let pending = pangramCache.get(text);
  if (!pending) {
    pending = chrome.runtime
      .sendMessage<unknown, PangramResponse>({ type: 'pangram', text })
      .catch((): PangramResponse => ({ ok: false, reason: 'extension_unavailable' }));
    pangramCache.set(text, pending);
  }
  return pending;
}

function injectStyles() {
  if (document.getElementById('xrs-styles')) return;
  const style = document.createElement('style');
  style.id = 'xrs-styles';
  // Badge text lives in ::before so it never pollutes the row's innerText.
  style.textContent = `
    .xrs-flagged { position: relative; }
    .xrs-flagged.xrs-likely { box-shadow: inset 3px 0 0 #f4212e; }
    .xrs-flagged.xrs-suspicious { box-shadow: inset 3px 0 0 #ffad1f; }
    .${BADGE_CLASS} {
      position: absolute; right: 12px; bottom: 8px; z-index: 2;
      display: inline-flex; gap: 4px; pointer-events: auto; cursor: help;
    }
    .xrs-chip {
      font: 700 11px/1 -apple-system, "Segoe UI", Roboto, sans-serif;
      padding: 4px 7px; border-radius: 999px; color: #fff; white-space: nowrap;
    }
    .xrs-chip::before { content: attr(data-label); }
    .xrs-chip.xrs-likely { background: #f4212e; }
    .xrs-chip.xrs-suspicious { background: #b86e00; }
    .${BADGE_CLASS}.xrs-inline { position: static; margin: 4px 0 0; }
    #xrs-summary {
      position: fixed; left: 16px; bottom: 16px; z-index: 2147483647;
      font: 600 13px/1.3 -apple-system, "Segoe UI", Roboto, sans-serif;
      background: rgba(15, 20, 25, 0.92); color: #e7e9ea; border: 1px solid #2f3336;
      border-radius: 999px; padding: 8px 14px; box-shadow: 0 4px 16px rgba(0,0,0,.35);
    }
    #xrs-summary::before { content: attr(data-label); }
    #xrs-summary[hidden] { display: none; }
  `;
  document.head.append(style);
}

function describe(kind: string, score: Score) {
  return `${kind}: ${score.score}/100 (${score.verdict})` + score.signals.map((s) => `\n  • ${s.label}`).join('');
}

function chip(label: string, verdict: Score['verdict']) {
  const el = document.createElement('span');
  el.className = `xrs-chip xrs-${verdict}`;
  el.dataset.label = label;
  return el;
}

function worst(result: Assessment): Score['verdict'] {
  const verdicts = [result.ai.verdict, result.spam.verdict];
  return verdicts.includes('likely') ? 'likely' : verdicts.includes('suspicious') ? 'suspicious' : 'clean';
}

function render(host: HTMLElement, result: Assessment, inline = false) {
  host.querySelector(`:scope > .${BADGE_CLASS}`)?.remove();
  host.classList.remove('xrs-flagged', 'xrs-likely', 'xrs-suspicious');

  const verdict = worst(result);
  if (verdict === 'clean') return;

  const badge = document.createElement('span');
  badge.className = BADGE_CLASS + (inline ? ' xrs-inline' : '');
  badge.title = `${describe('AI-written', result.ai)}\n${describe('Spam account', result.spam)}`;
  if (result.ai.verdict !== 'clean') {
    badge.append(chip(result.ai.verdict === 'likely' ? 'Likely AI' : 'Maybe AI', result.ai.verdict));
  }
  if (result.spam.verdict !== 'clean') {
    badge.append(chip(result.spam.verdict === 'likely' ? 'Likely spam' : 'Maybe spam', result.spam.verdict));
  }
  host.classList.add('xrs-flagged', `xrs-${verdict}`);
  host.append(badge);
}

function conversationKey(pathname: string) {
  return pathname.replace(/\/+$/, '');
}

function scanRows(): { total: number; flagged: number } {
  let total = 0;
  let flagged = 0;
  const seen = new Set<HTMLElement>();

  for (const match of document.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
    const row = match.closest<HTMLElement>('[data-testid="conversation"]') ?? match;
    if (seen.has(row) || row.closest('[data-testid="DmActivityViewport"]')) continue;
    seen.add(row);

    const text = row.innerText;
    const input = parseRowText(text);
    if (!input) continue;
    total += 1;

    const href = (row.matches('a') ? row : row.querySelector('a[href]'))?.getAttribute('href');
    if (href) senders.set(conversationKey(href), input);

    if (row.dataset.xrsSig !== text) {
      row.dataset.xrsSig = text;
      render(row, assess(input));
    }
    if (row.classList.contains('xrs-flagged')) flagged += 1;
  }
  return { total, flagged };
}

function scanThread() {
  const sender = senders.get(conversationKey(location.pathname));
  for (const entry of document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR)) {
    const text = entry.innerText.trim();
    if (!text || entry.dataset.xrsSig === text) continue;
    entry.dataset.xrsSig = text;
    const result = assess({ displayName: sender?.displayName ?? '', handle: sender?.handle ?? '', text });
    render(entry, result, true);

    if (text.split(/\s+/).length < PANGRAM_MIN_WORDS) continue;
    void pangram(text).then((response) => {
      if (!response.ok || entry.dataset.xrsSig !== text) return;
      render(entry, { ...result, ai: withPangram(result.ai, response.result) }, true);
    });
  }
}

function updateSummary(total: number, flagged: number) {
  let summary = document.getElementById('xrs-summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'xrs-summary';
    summary.title = 'X Request Screener — hover a badge to see why it was flagged';
    document.body.append(summary);
  }
  summary.hidden = total === 0;
  const label = `🛡 ${flagged} of ${total} conversation${total === 1 ? '' : 's'} flagged`;
  if (summary.dataset.label !== label) summary.dataset.label = label;
}

function scan() {
  if (!DM_ROUTE.test(location.pathname)) {
    document.getElementById('xrs-summary')?.setAttribute('hidden', '');
    return;
  }
  injectStyles();
  const { total, flagged } = scanRows();
  scanThread();
  updateSummary(total, flagged);
}

let pending = 0;
function schedule() {
  if (pending) return;
  pending = window.setTimeout(() => {
    pending = 0;
    scan();
  }, 250);
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
schedule();
