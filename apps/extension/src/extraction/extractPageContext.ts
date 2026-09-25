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

function numberFromLabel(label: string, name: string): number | undefined {
  const match = label.match(new RegExp(`([\\d,.]+)\\s+${name}`, 'i'));
  if (!match?.[1]) return undefined;
  const parsed = Number(match[1].replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function metricsFrom(root: ParentNode): PageMetrics {
  const label = root.querySelector('[role="group"][aria-label]')?.getAttribute('aria-label') ?? '';
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
  const identity = normalizeText(
    root.querySelector('[data-testid="UserName"], [data-testid="User-Name"]')?.textContent,
    160,
  );
  const handle = identity.match(/@[A-Za-z0-9_]{1,15}/)?.[0];
  const displayName = normalizeText(identity.split('@')[0], 80) || undefined;
  return {
    ...(handle ? { handle } : {}),
    ...(displayName ? { displayName } : {}),
  };
}

function detectPageType(url: URL): PageType {
  if (/\/status\/\d+/.test(url.pathname)) return 'post';
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
  const root = pageType === 'post' || pageType === 'feed' ? doc.querySelector('article') : doc;
  if (!root) return { ok: false, reason: 'page_not_recognized' };

  const identity = identityFrom(root);
  const textSource =
    pageType === 'profile'
      ? root.querySelector('[data-testid="UserDescription"]')
      : root.querySelector('[data-testid="tweetText"]');
  const text = normalizeText(textSource?.textContent);
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
  const currentUrl = new URL(globalThis.location.href);

  if (!['x.com', 'www.x.com'].includes(currentUrl.hostname.toLowerCase())) {
    return { ok: false, reason: 'unsupported_site' };
  }
  if (/^\/(messages|i\/chat)(?:\/|$)/.test(currentUrl.pathname)) {
    return { ok: false, reason: 'private_route' };
  }

  const pageType: PageType = /\/status\/\d+/.test(currentUrl.pathname)
    ? 'post'
    : /^\/[A-Za-z0-9_]{1,15}\/?$/.test(currentUrl.pathname)
      ? 'profile'
      : 'feed';
  const root = pageType === 'profile' ? document : document.querySelector('article');
  if (!root) return { ok: false, reason: 'page_not_recognized' };

  const identityText = normalize(
    root.querySelector('[data-testid="UserName"], [data-testid="User-Name"]')?.textContent,
    160,
  );
  const handle = identityText.match(/@[A-Za-z0-9_]{1,15}/)?.[0];
  const displayName = normalize(identityText.split('@')[0], 80) || undefined;
  const text = normalize(
    (pageType === 'profile'
      ? root.querySelector('[data-testid="UserDescription"]')
      : root.querySelector('[data-testid="tweetText"]'))?.textContent,
  );
  if (!text) return { ok: false, reason: 'page_not_recognized' };

  const label = root.querySelector('[role="group"][aria-label]')?.getAttribute('aria-label') ?? '';
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
