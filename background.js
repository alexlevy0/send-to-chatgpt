/**
 * background.js — Service Worker for "Send to ChatGPT"
 *
 * Responsibilities:
 * 1. Patch ChatGPT/OpenAI cookies for cross-origin iframe access (SameSite=None, Secure).
 * 2. Relay messages from content.js to the active tab (showPanel).
 */

// ─── Cookie Patching ────────────────────────────────────────────

/**
 * Modifies ChatGPT/OpenAI cookies so they are sent in cross-origin
 * iframe context: SameSite=None + Secure.
 */
async function fixCookies() {
  try {
    const allCookies = await chrome.cookies.getAll({});

    for (const cookie of allCookies) {
      const domainMatch =
        cookie.domain.includes('chatgpt.com') ||
        cookie.domain.includes('openai.com');

      if (!domainMatch || cookie.sameSite === 'no_restriction') continue;

      const url = 'https://' + cookie.domain.replace(/^\./, '') + cookie.path;

      const newCookie = {
        url,
        name:           cookie.name,
        value:          cookie.value,
        path:           cookie.path,
        secure:         true,
        httpOnly:       cookie.httpOnly,
        expirationDate: cookie.expirationDate,
        storeId:        cookie.storeId,
        sameSite:       'no_restriction'
      };

      // __Host- prefixed cookies MUST NOT have a domain attribute
      if (!cookie.name.startsWith('__Host-')) {
        newCookie.domain = cookie.domain;
      }

      await chrome.cookies.set(newCookie);
    }

    console.log('[SendToChatGPT] Cookies patched for iframe access.');
  } catch (err) {
    console.error('[SendToChatGPT] Cookie fix failed:', err);
  }
}

// ─── Message Relay ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'openWithSelection') return;

  (async () => {
    try {
      // Step 1: Patch cookies before showing the iframe
      await fixCookies();

      // Step 2: Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        console.warn('[SendToChatGPT] No active tab found.');
        sendResponse({ success: false, error: 'No active tab' });
        return;
      }

      // Step 3: Forward the showPanel command to the content script
      await chrome.tabs.sendMessage(tab.id, {
        action:          'showPanel',
        url:             message.url || tab.url,
        selection:       message.selection || '',
        promptTemplate:  message.promptTemplate,
        autoSubmit:      message.autoSubmit,
        contentBehavior: message.contentBehavior,
        force:           message.force || false
      });

      sendResponse({ success: true });
    } catch (err) {
      console.error('[SendToChatGPT] Relay error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  // Return true to indicate async sendResponse
  return true;
});
