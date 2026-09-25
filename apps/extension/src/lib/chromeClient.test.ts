import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPageContext } from './chromeClient';

describe('requestPageContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests extraction through the service worker', async () => {
    const sendMessage = vi.fn().mockResolvedValue({
      ok: false,
      reason: 'page_not_recognized',
    });
    vi.stubGlobal('chrome', { runtime: { sendMessage } });

    await expect(requestPageContext()).resolves.toEqual({
      ok: false,
      reason: 'page_not_recognized',
    });
    expect(sendMessage).toHaveBeenCalledWith({ type: 'extract_public_x_context' });
  });

  it('returns a clear failure outside an extension runtime', async () => {
    vi.stubGlobal('chrome', undefined);

    await expect(requestPageContext()).resolves.toEqual({
      ok: false,
      reason: 'extension_unavailable',
    });
  });
});
