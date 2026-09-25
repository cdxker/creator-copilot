import { assess, withPangram, type Assessment, type RequestInput, type Score } from './detector';
import type { PangramResponse } from './background';
import { parseRowText } from './parse';

const DM_ROUTE = /^\/(messages|i\/chat)(\/|$)/;
// XChat (x.com/i/chat): request rows and inbox rows. Request rows have no @handle in their text.
const CHAT_ROW_SELECTOR = '[data-testid^="dm-message-request-item-"], [data-testid^="dm-conversation-item-"]';
// Legacy DMs (x.com/messages).
const LEGACY_ROW_SELECTOR = '[data-testid="conversation"], a[href^="/messages/"]';
const MESSAGE_SELECTOR = '[data-testid^="message-text-"], [data-testid="messageEntry"]';
const HEADER_NAME_SELECTOR = '[data-testid="dm-conversation-username"]';
const FLAG_CLASS = 'xrs-flag';
const DIM_CLASS = 'xrs-dimmed';
// Pangram needs some text to work with; one-word openers are left to the heuristics.
const PANGRAM_MIN_WORDS = 12;

// Remember who sent each conversation so an opened thread can reuse the sender details.
const senders = new Map<string, RequestInput>();
const pangramCache = new Map<string, Promise<PangramResponse>>();
const results = new WeakMap<HTMLElement, { sig: string; result: Assessment }>();

function pangram(text: string) {
  let pending = pangramCache.get(text);
  if (!pending && !globalThis.chrome?.runtime?.id) return Promise.resolve<PangramResponse>({ ok: false, reason: 'extension_unavailable' });
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
  // The flag lives in ::before so it never pollutes the name's innerText.
  style.textContent = `
    .${DIM_CLASS} { opacity: 0.4; filter: grayscale(1); transition: opacity 120ms; }
    .${DIM_CLASS}:hover { opacity: 0.75; }
    .${FLAG_CLASS} { display: inline-block; margin-left: 6px; cursor: help; font-style: normal; }
    .${FLAG_CLASS}::before { content: "\\1F6A9"; }
  `;
  document.head.append(style);
}

function isFlagged(result: Assessment) {
  return result.ai.verdict !== 'clean' || result.spam.verdict !== 'clean';
}

function describe(kind: string, score: Score) {
  return `${kind}: ${score.score}/100 (${score.verdict})` + score.signals.map((s) => `\n  • ${s.label}`).join('');
}

// The deepest element whose text is exactly the display name.
function findNameElement(root: HTMLElement, name: string): HTMLElement | null {
  if (!name) return null;
  let match: HTMLElement | null = null;
  for (const el of root.querySelectorAll<HTMLElement>('span, div')) {
    if (el.innerText?.trim() === name) match = el;
  }
  return match;
}

function setFlag(nameEl: HTMLElement | null, result: Assessment) {
  if (!nameEl) return;
  let flag = nameEl.querySelector<HTMLElement>(`:scope > .${FLAG_CLASS}`);
  if (!isFlagged(result)) {
    flag?.remove();
    return;
  }
  if (!flag) {
    flag = document.createElement('i');
    flag.className = FLAG_CLASS;
    nameEl.append(flag);
  }
  flag.title = `${describe('AI-written', result.ai)}\n${describe('Spam account', result.spam)}`;
}

// Scores `host` once per distinct `sig`, upgrading the AI verdict with Pangram when there's enough text.
function evaluate(host: HTMLElement, sig: string, input: RequestInput, show: (result: Assessment) => void) {
  const cached = results.get(host);
  if (cached?.sig === sig) {
    show(cached.result);
    return;
  }
  const result = assess(input);
  results.set(host, { sig, result });
  show(result);

  if (input.text.split(/\s+/).length < PANGRAM_MIN_WORDS) return;
  void pangram(input.text).then((response) => {
    if (!response.ok || results.get(host)?.sig !== sig) return;
    const merged = { ...result, ai: withPangram(result.ai, response.result) };
    results.set(host, { sig, result: merged });
    show(merged);
  });
}

function conversationKey(pathname: string) {
  return pathname.replace(/\/+$/, '');
}

function scanRows() {
  const seen = new Set<HTMLElement>();
  const candidates = [
    ...[...document.querySelectorAll<HTMLElement>(CHAT_ROW_SELECTOR)].map((el) => ({ el, requireHandle: false })),
    ...[...document.querySelectorAll<HTMLElement>(LEGACY_ROW_SELECTOR)].map((el) => ({ el, requireHandle: true })),
  ];

  for (const { el, requireHandle } of candidates) {
    const row = el.closest<HTMLElement>('[data-testid="conversation"]') ?? el;
    if (seen.has(row) || row.closest('[data-testid="DmActivityViewport"], [data-testid="dm-message-scroller"]')) continue;
    seen.add(row);

    const text = row.innerText;
    const description = row.getAttribute('aria-description') ?? row.closest('[aria-description]')?.getAttribute('aria-description') ?? null;
    const input = parseRowText(text, { requireHandle, description });
    if (!input) continue;

    const href = (row.matches('a') ? row : row.querySelector('a[href]'))?.getAttribute('href');
    if (href) senders.set(conversationKey(href), input);

    evaluate(row, text, input, (result) => {
      row.classList.toggle(DIM_CLASS, isFlagged(result));
      setFlag(findNameElement(row, input.displayName), result);
    });
  }
}

// XChat right-aligns the viewer's own bubbles; only incoming messages are scored.
function isOwnMessage(entry: HTMLElement) {
  const id = entry.dataset.testid?.replace(/^message-text-/, '');
  const bubble = id ? document.querySelector<HTMLElement>(`[data-testid="message-${CSS.escape(id)}"]`) : null;
  return !!bubble && getComputedStyle(bubble).justifyContent === 'flex-end';
}

function scanThread() {
  const nameEl = document.querySelector<HTMLElement>(HEADER_NAME_SELECTOR);
  if (!nameEl) return;

  const incoming = [...document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR)]
    .filter((entry) => !isOwnMessage(entry))
    .map((entry) => entry.innerText.trim())
    .filter(Boolean);
  if (!incoming.length) return;

  const remembered = senders.get(conversationKey(location.pathname));
  const headerHref = document.querySelector('[data-testid="dm-conversation-header"] a[href]')?.getAttribute('href') ?? '';
  const headerHandle = headerHref.match(/^(?:https:\/\/x\.com)?\/([A-Za-z0-9_]{1,15})\/?$/)?.[1];
  const input: RequestInput = {
    displayName: nameEl.innerText.trim() || remembered?.displayName || '',
    handle: headerHandle || remembered?.handle || '',
    text: incoming.join('\n'),
    ...(remembered?.followers === undefined ? {} : { followers: remembered.followers }),
  };

  evaluate(nameEl, `${location.pathname}\n${input.text}`, input, (result) => setFlag(nameEl, result));
}

function scan() {
  if (!DM_ROUTE.test(location.pathname)) return;
  injectStyles();
  scanRows();
  scanThread();
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
