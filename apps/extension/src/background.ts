import { extractPageContextInTab } from './extraction/extractPageContext';

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (
    !message ||
    typeof message !== 'object' ||
    !('type' in message) ||
    message.type !== 'extract_public_x_context'
  ) {
    return false;
  }

  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      sendResponse({ ok: false, reason: 'no_active_tab' });
      return;
    }

    const activeUrl = new URL(tab.url);
    if (!['x.com', 'www.x.com'].includes(activeUrl.hostname.toLowerCase())) {
      sendResponse({ ok: false, reason: 'unsupported_site' });
      return;
    }
    if (/^\/(messages|i\/chat)(?:\/|$)/.test(activeUrl.pathname)) {
      sendResponse({ ok: false, reason: 'private_route' });
      return;
    }

    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContextInTab,
      });
      sendResponse(result?.result ?? { ok: false, reason: 'page_not_recognized' });
    } catch {
      sendResponse({ ok: false, reason: 'permission_denied' });
    }
  })();

  return true;
});
