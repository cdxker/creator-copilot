import type { ExtractionResult } from '../extraction/extractPageContext';

export type ClientExtractionResult =
  | ExtractionResult
  | {
      ok: false;
      reason:
        | 'extension_unavailable'
        | 'no_active_tab'
        | 'permission_denied';
    };

export async function requestPageContext(): Promise<ClientExtractionResult> {
  if (!globalThis.chrome?.runtime?.sendMessage) {
    return { ok: false, reason: 'extension_unavailable' };
  }
  return chrome.runtime.sendMessage({ type: 'extract_public_x_context' });
}
