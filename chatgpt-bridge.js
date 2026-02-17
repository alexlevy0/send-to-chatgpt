/**
 * chatgpt-bridge.js — Injected into ChatGPT iframe (all_frames: true)
 *
 * Listens for postMessage from content.js and fills the ChatGPT prompt
 * textarea with the user's prompt, supporting replace/append modes
 * and auto-submit.
 */

console.log('[SendToChatGPT] Bridge script loaded.');

// ─── State ──────────────────────────────────────────────────────
let lastProcessedPrompt = '';

// ─── i18n: Default Prompt Template ──────────────────────────────
function getDefaultPromptTemplate() {
  const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();

  if (lang.startsWith('fr')) return 'Résume ceci de manière concise et structurée : {url}';
  if (lang.startsWith('es')) return 'Resume esto de manera concisa y estructurada: {url}';
  if (lang.startsWith('de')) return 'Fasse dies kurz und strukturiert zusammen: {url}';
  if (lang.startsWith('it')) return 'Riassumi in modo conciso e strutturato: {url}';
  if (lang.startsWith('pt')) return 'Resuma de forma concisa e estruturada: {url}';
  if (lang.startsWith('zh')) return '简明扼要地总结这个内容：{url}';
  if (lang.startsWith('ja')) return 'これを簡潔に構造化して要約してください：{url}';
  if (lang.startsWith('ru')) return 'Кратко и структурировано перескажи: {url}';

  return 'Summarize this concisely: {url}';
}

// ─── Message Listener ───────────────────────────────────────────
window.addEventListener('message', (event) => {
  if (!event.data || event.data.action !== 'fillPrompt') return;

  const {
    url = '',
    selection = '',
    promptTemplate,
    autoSubmit = false,
    contentBehavior = 'replace',
    force = false
  } = event.data;

  // Build the final prompt from the template
  const template = promptTemplate || getDefaultPromptTemplate();
  let finalPrompt;

  if (selection && !template.includes('{selection}')) {
    // Selection was provided but the template has no {selection} placeholder.
    // Use the selection directly as the prompt (this is the "send selection" shortcut).
    finalPrompt = selection;
  } else {
    finalPrompt = template
      .replace(/\{url\}/g, url)
      .replace(/\{selection\}/g, selection);
  }

  // Skip if already processed (unless forced)
  if (!force && finalPrompt === lastProcessedPrompt) {
    console.log('[SendToChatGPT] Prompt already processed, skipping.');
    return;
  }

  console.log('[SendToChatGPT] Filling prompt:', finalPrompt.substring(0, 80) + '…');
  fillPrompt(finalPrompt, contentBehavior, autoSubmit);
  lastProcessedPrompt = finalPrompt;

  // Acknowledge receipt to stop the retry loop in content.js
  window.parent.postMessage({ action: 'fillPromptAck' }, '*');
});

// ─── Find Textarea ──────────────────────────────────────────────
function findTextarea() {
  const selectors = [
    '#prompt-textarea',
    'div#prompt-textarea',
    'div[contenteditable="true"]',
    'textarea[data-id="root"]',
    'textarea'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }

  return null;
}

// ─── Fill Prompt ────────────────────────────────────────────────
function fillPrompt(text, behavior, autoSubmit) {
  const textarea = findTextarea();

  if (!textarea) {
    console.warn('[SendToChatGPT] ChatGPT textarea not found. Retrying in 1s…');
    setTimeout(() => fillPrompt(text, behavior, autoSubmit), 1000);
    return;
  }

  textarea.focus();

  if (behavior === 'replace') {
    // Select all existing content, then replace with new text
    document.execCommand('selectAll', false, null);
    const inserted = document.execCommand('insertText', false, text);

    if (!inserted) {
      // Fallback for browsers/contexts where execCommand doesn't work
      console.log('[SendToChatGPT] execCommand fallback…');
      applyFallback(textarea, text);
    }
  } else {
    // Append: move cursor to end, add newline, then insert
    moveCursorToEnd(textarea);
    const currentContent = textarea.textContent || textarea.value || '';
    const prefix = currentContent.length > 0 ? '\n' : '';
    const inserted = document.execCommand('insertText', false, prefix + text);

    if (!inserted) {
      console.log('[SendToChatGPT] execCommand fallback (append)…');
      applyFallback(textarea, currentContent + prefix + text);
    }
  }

  console.log('[SendToChatGPT] Prompt filled successfully.');

  // Auto-submit if enabled
  if (autoSubmit) {
    setTimeout(() => submitPrompt(textarea), 500);
  }
}

// ─── Fallback Fill ──────────────────────────────────────────────
function applyFallback(textarea, text) {
  if (textarea.isContentEditable) {
    textarea.innerHTML = `<p>${escapeHtml(text)}</p>`;
  } else {
    textarea.value = text;
  }
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── Move Cursor to End ─────────────────────────────────────────
function moveCursorToEnd(el) {
  if (el.isContentEditable) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false); // Collapse to end
    sel.removeAllRanges();
    sel.addRange(range);
  } else if (typeof el.setSelectionRange === 'function') {
    const len = (el.value || '').length;
    el.setSelectionRange(len, len);
  }
}

// ─── Submit Prompt ──────────────────────────────────────────────
function submitPrompt(textarea) {
  // Try finding the send button
  const sendButton =
    document.querySelector('button[data-testid="send-button"]') ||
    document.querySelector('button[aria-label="Send prompt"]') ||
    document.querySelector('button[aria-label="Envoyer le message"]');

  if (sendButton && !sendButton.disabled) {
    console.log('[SendToChatGPT] Clicking send button.');
    sendButton.click();
    return;
  }

  // Fallback: simulate Enter key
  console.log('[SendToChatGPT] Send button not found/ready, simulating Enter…');
  textarea.focus();

  const eventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    composed: true
  };

  textarea.dispatchEvent(new KeyboardEvent('keydown', eventInit));
  textarea.dispatchEvent(new KeyboardEvent('keypress', eventInit));
  textarea.dispatchEvent(new KeyboardEvent('keyup', eventInit));
}

// ─── Utilities ──────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
