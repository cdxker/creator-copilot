import type { PageContext, PageMetrics, PageType } from '@creator-copilot/shared';

export type ExtractionFailureReason =
  | 'unsupported_site'
  | 'private_route'
  | 'page_not_recognized';

export type ExtractionResult =
  | { ok: true; context: PageContext }
  | { ok: false; reason: ExtractionFailureReason };

function normalizeText(value: string | null | undefined, limit = 1800): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function isElementVisible(element: Element, doc: Document): boolean {
  let current: Element | null = element;
  while (current) {
    if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true') return false;
    const style = doc.defaultView?.getComputedStyle(current);
    if (
      style &&
      (style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        style.opacity === '0')
    ) {
      return false;
    }
    current = current.parentElement;
  }
  return true;
}

function queryVisible(root: ParentNode, selector: string, doc: Document): Element | null {
  return Array.from(root.querySelectorAll(selector)).find((element) => isElementVisible(element, doc)) ?? null;
}

function visibleText(element: Element, doc: Document, limit = 1800): string {
  const showText = doc.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = doc.createTreeWalker(element, showText);
  const parts: string[] = [];
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && isElementVisible(parent, doc)) parts.push(node.nodeValue ?? '');
    node = walker.nextNode();
  }
  return normalizeText(parts.join(' '), limit);
}

function numberFromLabel(label: string, name: string): number | undefined {
  const match = label.match(new RegExp(`([\\d,.]+)\\s+${name}`, 'i'));
  if (!match?.[1]) return undefined;
  const parsed = Number(match[1].replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function metricsFrom(root: ParentNode): PageMetrics {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) return {};
  const label = queryVisible(root, '[role="group"][aria-label]', doc)?.getAttribute('aria-label') ?? '';
  const metrics: PageMetrics = {};
  const replies = numberFromLabel(label, 'repl(?:y|ies)');
  const reposts = numberFromLabel(label, 'reposts?');
  const likes = numberFromLabel(label, 'likes?');
  const views = numberFromLabel(label, 'views?');
  if (replies !== undefined) metrics.replies = replies;
  if (reposts !== undefined) metrics.reposts = reposts;
  if (likes !== undefined) metrics.likes = likes;
  if (views !== undefined) metrics.views = views;
  return metrics;
}

function identityFrom(root: ParentNode): { handle?: string; displayName?: string } {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) return {};
  const identityElement = queryVisible(
    root,
    '[data-testid="UserName"], [data-testid="User-Name"]',
    doc,
  );
  const identity = identityElement ? visibleText(identityElement, doc, 160) : '';
  const handle = identity.match(/@[A-Za-z0-9_]{1,15}/)?.[0];
  const displayName = normalizeText(identity.split('@')[0], 80) || undefined;
  return {
    ...(handle ? { handle } : {}),
    ...(displayName ? { displayName } : {}),
  };
}

function detectPageType(url: URL): PageType {
  if (/\/status\/\d+/.test(url.pathname)) return 'post';
  if (/^\/(home|explore|search|notifications|compose|i)(?:\/|$)/.test(url.pathname)) return 'feed';
  if (/^\/[A-Za-z0-9_]{1,15}\/?$/.test(url.pathname)) return 'profile';
  return 'feed';
}

export function extractPageContext(doc: Document, url: URL): ExtractionResult {
  if (!['x.com', 'www.x.com'].includes(url.hostname.toLowerCase())) {
    return { ok: false, reason: 'unsupported_site' };
  }
  if (/^\/(messages|i\/chat)(?:\/|$)/.test(url.pathname)) {
    return { ok: false, reason: 'private_route' };
  }

  const pageType = detectPageType(url);
  const root =
    pageType === 'post' || pageType === 'feed'
      ? Array.from(doc.querySelectorAll('article')).find((article) => isElementVisible(article, doc)) ?? null
      : doc;
  if (!root) return { ok: false, reason: 'page_not_recognized' };

  const identity = identityFrom(root);
  const textSource =
    pageType === 'profile'
      ? queryVisible(root, '[data-testid="UserDescription"]', doc)
      : queryVisible(root, '[data-testid="tweetText"]', doc);
  const text = textSource ? visibleText(textSource, doc) : '';
  if (!text) return { ok: false, reason: 'page_not_recognized' };

  return {
    ok: true,
    context: {
      version: 1,
      source: 'x',
      pageType,
      url: url.href,
      ...identity,
      text,
      metrics: metricsFrom(root),
    },
  };
}

// Chrome serializes this function for executeScript, so it must remain self-contained.
export function extractPageContextInTab(): ExtractionResult {
  const normalize = (value: string | null | undefined, limit = 1800) =>
    (value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
  const isVisible = (element: Element) => {
    let current: Element | null = element;
    while (current) {
      if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true') return false;
      const style = document.defaultView?.getComputedStyle(current);
      if (
        style &&
        (style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse' ||
          style.opacity === '0')
      ) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  };
  const queryVisibleInTab = (root: ParentNode, selector: string) =>
    Array.from(root.querySelectorAll(selector)).find((element) => isVisible(element)) ?? null;
  const visibleTextInTab = (element: Element, limit = 1800) => {
    const walker = document.createTreeWalker(
      element,
      document.defaultView?.NodeFilter.SHOW_TEXT ?? 4,
    );
    const parts: string[] = [];
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && isVisible(parent)) parts.push(node.nodeValue ?? '');
      node = walker.nextNode();
    }
    return normalize(parts.join(' '), limit);
  };
  const currentUrl = new URL(globalThis.location.href);

  if (!['x.com', 'www.x.com'].includes(currentUrl.hostname.toLowerCase())) {
    return { ok: false, reason: 'unsupported_site' };
  }
  if (/^\/(messages|i\/chat)(?:\/|$)/.test(currentUrl.pathname)) {
    return { ok: false, reason: 'private_route' };
  }

  let pageType: PageType = 'feed';
  if (/\/status\/\d+/.test(currentUrl.pathname)) {
    pageType = 'post';
  } else if (
    !/^\/(home|explore|search|notifications|compose|i)(?:\/|$)/.test(currentUrl.pathname) &&
    /^\/[A-Za-z0-9_]{1,15}\/?$/.test(currentUrl.pathname)
  ) {
    pageType = 'profile';
  }
  const root =
    pageType === 'profile'
      ? document
      : Array.from(document.querySelectorAll('article')).find((article) => isVisible(article)) ?? null;
  if (!root) return { ok: false, reason: 'page_not_recognized' };

  const identityElement = queryVisibleInTab(
    root,
    '[data-testid="UserName"], [data-testid="User-Name"]',
  );
  const identityText = identityElement ? visibleTextInTab(identityElement, 160) : '';
  const handle = identityText.match(/@[A-Za-z0-9_]{1,15}/)?.[0];
  const displayName = normalize(identityText.split('@')[0], 80) || undefined;
  const textElement =
    pageType === 'profile'
      ? queryVisibleInTab(root, '[data-testid="UserDescription"]')
      : queryVisibleInTab(root, '[data-testid="tweetText"]');
  const text = textElement ? visibleTextInTab(textElement) : '';
  if (!text) return { ok: false, reason: 'page_not_recognized' };

  const label = queryVisibleInTab(root, '[role="group"][aria-label]')?.getAttribute('aria-label') ?? '';
  const readMetric = (name: string) => {
    const raw = label.match(new RegExp(`([\\d,.]+)\\s+${name}`, 'i'))?.[1];
    if (!raw) return undefined;
    const parsed = Number(raw.replaceAll(',', ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const metrics: PageMetrics = {};
  const replies = readMetric('repl(?:y|ies)');
  const reposts = readMetric('reposts?');
  const likes = readMetric('likes?');
  const views = readMetric('views?');
  if (replies !== undefined) metrics.replies = replies;
  if (reposts !== undefined) metrics.reposts = reposts;
  if (likes !== undefined) metrics.likes = likes;
  if (views !== undefined) metrics.views = views;

  return {
    ok: true,
    context: {
      version: 1,
      source: 'x',
      pageType,
      url: currentUrl.href,
      ...(handle ? { handle } : {}),
      ...(displayName ? { displayName } : {}),
      text,
      metrics,
    },
  };
}
