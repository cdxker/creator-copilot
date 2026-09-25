import { beforeEach, describe, expect, it } from 'vitest';
import { extractPageContext } from './extractPageContext';
import { postFixture, profileFixture } from './fixtures';

describe('extractPageContext', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('rejects a non-X active tab', () => {
    document.body.innerHTML = '<main>unrelated private page</main>';

    expect(extractPageContext(document, new URL('https://example.com/account'))).toEqual({
      ok: false,
      reason: 'unsupported_site',
    });
  });

  it('rejects X direct-message routes without returning DOM content', () => {
    document.body.innerHTML = '<main>private message text</main>';

    expect(extractPageContext(document, new URL('https://x.com/messages/1'))).toEqual({
      ok: false,
      reason: 'private_route',
    });
  });

  it('extracts a public post and its visible metrics', () => {
    document.body.innerHTML = postFixture('Quiet luxury is a standard, not a trend.');

    expect(extractPageContext(document, new URL('https://x.com/velvetpilot/status/123'))).toEqual({
      ok: true,
      context: {
        version: 1,
        source: 'x',
        pageType: 'post',
        url: 'https://x.com/velvetpilot/status/123',
        handle: '@velvetpilot',
        displayName: 'Velvet Pilot',
        text: 'Quiet luxury is a standard, not a trend.',
        metrics: { replies: 3, reposts: 5, likes: 42, views: 1200 },
      },
    });
  });

  it('extracts a public profile', () => {
    document.body.innerHTML = profileFixture;
    const result = extractPageContext(document, new URL('https://x.com/velvetpilot'));

    expect(result).toMatchObject({
      ok: true,
      context: {
        pageType: 'profile',
        handle: '@velvetpilot',
        displayName: 'Velvet Pilot',
        text: 'Creator strategy, rituals, and sharp opinions.',
      },
    });
  });

  it('normalizes and bounds public post text', () => {
    document.body.innerHTML = postFixture('  hello   world '.repeat(300));
    const result = extractPageContext(
      document,
      new URL('https://x.com/velvetpilot/status/123'),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.text.length).toBeLessThanOrEqual(1800);
      expect(result.context.text).not.toMatch(/\s{2,}/);
    }
  });

  it('fails closed when stable public-page cues are missing', () => {
    document.body.innerHTML = '<main><div>Loading</div></main>';

    expect(extractPageContext(document, new URL('https://x.com/velvetpilot'))).toEqual({
      ok: false,
      reason: 'page_not_recognized',
    });
  });
});
