/**
 * content.js — Injected on all pages for "Send to ChatGPT"
 *
 * Responsibilities:
 * 1. Load user settings from chrome.storage.sync.
 * 2. Listen for keyboard shortcuts and trigger selection/URL capture.
 * 3. Manage the ChatGPT side panel (create, update, destroy, resize).
 * 4. Communicate with chatgpt-bridge.js inside the iframe via postMessage.
 */

// ─── State ──────────────────────────────────────────────────────
let settings = null;
let panelOpen = false;
let panelIframe = null;
let savedWidth = parseInt(localStorage.getItem('sendToChatGPT_panelWidth'), 10) || 450;

// ─── Default Settings ───────────────────────────────────────────
const DEFAULTS = {
  selectionShortcut:        { ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, key: 'S' },
  urlShortcut:              { ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, key: 'U' },
  urlPromptTemplate:        'Summarize this concisely: {url}',
  selectionPromptTemplate:  'Explain and analyze this text:\n\n{selection}',
  contentBehavior:          'replace',
  autoSubmit:               true
};

// ─── Init: Load Settings ────────────────────────────────────────
chrome.storage.sync.get(DEFAULTS, (result) => {
  settings = { ...DEFAULTS, ...result };
  console.log('[SendToChatGPT] Settings loaded:', settings);
});

// Reactively update settings when changed in popup
chrome.storage.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (settings && key in settings) {
      settings[key] = newValue;
    }
  }
  console.log('[SendToChatGPT] Settings updated:', settings);
});

// ─── Shortcut Matching ─────────────────────────────────────────
function matchesShortcut(event, shortcut) {
  if (!shortcut || !shortcut.key) return false;
  return (
    event.ctrlKey  === !!shortcut.ctrlKey &&
    event.altKey   === !!shortcut.altKey &&
    event.shiftKey === !!shortcut.shiftKey &&
    event.metaKey  === !!shortcut.metaKey &&
    event.key.toUpperCase() === shortcut.key.toUpperCase()
  );
}

// ─── Keyboard Listener ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (!settings) return;

  // Ignore if the user is typing in an input/textarea (unless it's our panel)
  const tag = (e.target.tagName || '').toLowerCase();
  const isEditable = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
  // Still allow shortcuts if the target is inside our panel
  const inOurPanel = e.target.closest && e.target.closest('#stcg-panel');
  if (isEditable && !inOurPanel) return;

  // Escape key closes the panel
  if (e.key === 'Escape' && panelOpen) {
    e.preventDefault();
    destroyPanel();
    return;
  }

  if (matchesShortcut(e, settings.selectionShortcut)) {
    e.preventDefault();
    e.stopPropagation();
    const selection = window.getSelection().toString().trim();
    if (!selection) {
      console.log('[SendToChatGPT] No text selected.');
      return;
    }
    sendToBackground(selection, false, settings.selectionPromptTemplate);
  } else if (matchesShortcut(e, settings.urlShortcut)) {
    e.preventDefault();
    e.stopPropagation();
    sendToBackground('', true, settings.urlPromptTemplate);
  }
}, true); // Capture phase for priority

// ─── Send to Background ────────────────────────────────────────
function sendToBackground(selection, force, promptTemplate) {
  chrome.runtime.sendMessage({
    action:          'openWithSelection',
    url:             window.location.href,
    selection,
    promptTemplate,
    autoSubmit:      settings.autoSubmit,
    contentBehavior: settings.contentBehavior,
    force
  });
}

// ─── Message Listener (from Background) ─────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'showPanel') {
    if (panelOpen) {
      // Update mode: re-send data to existing iframe
      sendDataToIframe(message);
    } else {
      createPanel(message);
    }
  }
});

// ─── Panel: Create ──────────────────────────────────────────────
function createPanel(data) {
  if (panelOpen) return;
  panelOpen = true;

  // Overlay container
  const panel = document.createElement('div');
  panel.id = 'stcg-panel';

  // Drag handle (left edge)
  const handle = document.createElement('div');
  handle.id = 'stcg-handle';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.id = 'stcg-close';
  closeBtn.innerHTML = '✕';
  closeBtn.title = 'Close panel';
  closeBtn.addEventListener('click', destroyPanel);

  // Iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'stcg-iframe';
  iframe.src = 'https://chatgpt.com';
  iframe.setAttribute('sandbox',
    'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
  );

  // Assemble
  panel.appendChild(handle);
  panel.appendChild(closeBtn);
  panel.appendChild(iframe);
  document.body.appendChild(panel);

  // Apply saved width
  panel.style.width = savedWidth + 'px';

  // Keep reference
  panelIframe = iframe;

  // Wait for iframe to load, then send data
  // We use a flag to stop retrying once the bridge confirms receipt
  let promptSent = false;

  // Listen for acknowledgment from the bridge
  const onBridgeAck = (event) => {
    if (event.data && event.data.action === 'fillPromptAck') {
      promptSent = true;
      window.removeEventListener('message', onBridgeAck);
    }
  };
  window.addEventListener('message', onBridgeAck);

  iframe.addEventListener('load', () => {
    // Initial delay for ChatGPT React hydration
    setTimeout(() => sendDataToIframe(data), 2500);

    // Retry a few times — stop once the bridge acknowledges
    let attempts = 0;
    const retryInterval = setInterval(() => {
      if (!panelOpen || promptSent || attempts >= 4) {
        clearInterval(retryInterval);
        return;
      }
      sendDataToIframe(data);
      attempts++;
    }, 3000);
  });

  // Initialize drag resize
  initResize(handle, panel);
}

// ─── Panel: Destroy ─────────────────────────────────────────────
function destroyPanel() {
  const panel = document.getElementById('stcg-panel');
  if (panel) panel.remove();
  panelOpen = false;
  panelIframe = null;
}

// ─── Panel: Send Data to Iframe ─────────────────────────────────
function sendDataToIframe(data) {
  if (!panelIframe || !panelIframe.contentWindow) return;

  panelIframe.contentWindow.postMessage({
    action:          'fillPrompt',
    url:             data.url || '',
    selection:       data.selection || '',
    promptTemplate:  data.promptTemplate || settings.promptTemplate,
    autoSubmit:      data.autoSubmit !== undefined ? data.autoSubmit : settings.autoSubmit,
    contentBehavior: data.contentBehavior || settings.contentBehavior,
    force:           data.force || false
  }, '*');
}

// ─── Panel: Resize via Drag Handle ──────────────────────────────
function initResize(handle, panel) {
  let isDragging = false;

  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();

    // Overlay to prevent iframe stealing mouse events during drag
    const overlay = document.createElement('div');
    overlay.id = 'stcg-drag-overlay';
    document.body.appendChild(overlay);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newWidth = window.innerWidth - e.clientX;
    const clamped = Math.max(300, Math.min(window.innerWidth * 0.8, newWidth));
    panel.style.width = clamped + 'px';
    savedWidth = clamped;
    localStorage.setItem('sendToChatGPT_panelWidth', String(clamped));
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    const overlay = document.getElementById('stcg-drag-overlay');
    if (overlay) overlay.remove();
  });
}
