/**
 * popup.js — Settings UI for "Send to ChatGPT"
 *
 * Manages shortcut recording, dual prompt templates, behavior options,
 * and auto-persistence via chrome.storage.sync.
 */

// ─── i18n Default Templates ────────────────────────────────────
function getDefaultUrlTemplate() {
  const lang = (navigator.language || 'en').toLowerCase();
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

function getDefaultSelectionTemplate() {
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('fr')) return 'Explique et analyse ce texte :\n\n{selection}';
  if (lang.startsWith('es')) return 'Explica y analiza este texto:\n\n{selection}';
  if (lang.startsWith('de')) return 'Erkläre und analysiere diesen Text:\n\n{selection}';
  if (lang.startsWith('it')) return 'Spiega e analizza questo testo:\n\n{selection}';
  if (lang.startsWith('pt')) return 'Explique e analise este texto:\n\n{selection}';
  if (lang.startsWith('zh')) return '解释和分析这段文字：\n\n{selection}';
  if (lang.startsWith('ja')) return 'このテキストを説明・分析してください：\n\n{selection}';
  if (lang.startsWith('ru')) return 'Объясни и проанализируй этот текст:\n\n{selection}';
  return 'Explain and analyze this text:\n\n{selection}';
}

// ─── Default Settings ───────────────────────────────────────────
const DEFAULTS = {
  selectionShortcut:        { ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, key: 'S' },
  urlShortcut:              { ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, key: 'U' },
  urlPromptTemplate:        getDefaultUrlTemplate(),
  selectionPromptTemplate:  getDefaultSelectionTemplate(),
  contentBehavior:          'replace',
  autoSubmit:               true
};

// ─── DOM References ─────────────────────────────────────────────
const btnSelectionShortcut      = document.getElementById('btn-shortcut-selection');
const btnUrlShortcut            = document.getElementById('btn-shortcut-url');
const urlPromptTemplateEl       = document.getElementById('url-prompt-template');
const selectionPromptTemplateEl = document.getElementById('selection-prompt-template');
const autoSubmitEl              = document.getElementById('auto-submit');
const saveStatusEl              = document.getElementById('save-status');

// ─── State ──────────────────────────────────────────────────────
let currentSettings = { ...DEFAULTS };
let activeRecorder  = null;
let saveTimeout     = null;

// ─── Shortcut Formatting ────────────────────────────────────────
function formatShortcut(shortcut) {
  if (!shortcut?.key) return 'Not set';
  const parts = [];
  if (shortcut.ctrlKey)  parts.push('Ctrl');
  if (shortcut.altKey)   parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.metaKey)  parts.push('Meta');
  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
  return parts.join(' + ');
}

// ─── Auto-Save (debounced) ──────────────────────────────────────
function autoSave() {
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    const behaviorRadio = document.querySelector('input[name="contentBehavior"]:checked');

    const settings = {
      selectionShortcut:        currentSettings.selectionShortcut,
      urlShortcut:              currentSettings.urlShortcut,
      urlPromptTemplate:        urlPromptTemplateEl.value.trim() || DEFAULTS.urlPromptTemplate,
      selectionPromptTemplate:  selectionPromptTemplateEl.value.trim() || DEFAULTS.selectionPromptTemplate,
      contentBehavior:          behaviorRadio ? behaviorRadio.value : 'replace',
      autoSubmit:               autoSubmitEl.checked
    };

    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error', 'error');
        console.error('Save error:', chrome.runtime.lastError);
      } else {
        showStatus('✓ Saved', 'success');
        currentSettings = { ...settings };
      }
    });
  }, 400);
}

function showStatus(text, type) {
  saveStatusEl.textContent = text;
  saveStatusEl.className = `save-status ${type}`;
  setTimeout(() => {
    saveStatusEl.textContent = '';
    saveStatusEl.className = 'save-status';
  }, 1500);
}

// ─── UI Population ──────────────────────────────────────────────
function populateUI(settings) {
  btnSelectionShortcut.querySelector('.shortcut-label').textContent =
    formatShortcut(settings.selectionShortcut);
  btnUrlShortcut.querySelector('.shortcut-label').textContent =
    formatShortcut(settings.urlShortcut);

  urlPromptTemplateEl.value       = settings.urlPromptTemplate       || DEFAULTS.urlPromptTemplate;
  selectionPromptTemplateEl.value = settings.selectionPromptTemplate || DEFAULTS.selectionPromptTemplate;

  const behaviorRadio = document.querySelector(
    `input[name="contentBehavior"][value="${settings.contentBehavior || 'replace'}"]`
  );
  if (behaviorRadio) behaviorRadio.checked = true;

  autoSubmitEl.checked = settings.autoSubmit !== false;
}

// ─── Shortcut Recorder ─────────────────────────────────────────
function startRecording(settingKey, buttonEl) {
  stopRecording();
  activeRecorder = settingKey;
  buttonEl.classList.add('recording');
  buttonEl.querySelector('.shortcut-label').textContent = 'Press a key combo…';
}

function stopRecording() {
  if (!activeRecorder) return;
  activeRecorder = null;
  document.querySelectorAll('.shortcut-btn').forEach(btn => btn.classList.remove('recording'));
}

function handleRecordKeydown(e) {
  if (!activeRecorder) return;
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

  e.preventDefault();
  e.stopPropagation();

  const shortcut = {
    ctrlKey:  e.ctrlKey,
    altKey:   e.altKey,
    shiftKey: e.shiftKey,
    metaKey:  e.metaKey,
    key:      e.key.length === 1 ? e.key.toUpperCase() : e.key
  };

  currentSettings[activeRecorder] = shortcut;

  const btn = document.querySelector(`[data-shortcut="${activeRecorder}"]`);
  if (btn) btn.querySelector('.shortcut-label').textContent = formatShortcut(shortcut);

  stopRecording();
  autoSave();
}

// ─── Event Listeners ────────────────────────────────────────────
btnSelectionShortcut.addEventListener('click', () => {
  startRecording('selectionShortcut', btnSelectionShortcut);
});

btnUrlShortcut.addEventListener('click', () => {
  startRecording('urlShortcut', btnUrlShortcut);
});

document.addEventListener('keydown', handleRecordKeydown, true);

// Auto-save on any change
urlPromptTemplateEl.addEventListener('input', autoSave);
selectionPromptTemplateEl.addEventListener('input', autoSave);
autoSubmitEl.addEventListener('change', autoSave);
document.querySelectorAll('input[name="contentBehavior"]').forEach(radio => {
  radio.addEventListener('change', autoSave);
});

// ─── Load Settings on Open ──────────────────────────────────────
chrome.storage.sync.get(DEFAULTS, (settings) => {
  currentSettings = { ...DEFAULTS, ...settings };
  populateUI(currentSettings);
});
