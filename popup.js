/**
 * popup.js — Settings UI for "Send to ChatGPT"
 *
 * Manages shortcut recording, prompt template, behavior options,
 * and auto-persistence via chrome.storage.sync (no Save button).
 */

// ─── Default Settings ───────────────────────────────────────────
const DEFAULTS = {
  selectionShortcut: { ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, key: 'S' },
  urlShortcut:       { ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, key: 'U' },
  promptTemplate:    'Résume ceci : {url}',
  contentBehavior:   'replace',
  autoSubmit:        true
};

// ─── DOM References ─────────────────────────────────────────────
const btnSelectionShortcut = document.getElementById('btn-shortcut-selection');
const btnUrlShortcut       = document.getElementById('btn-shortcut-url');
const promptTemplateEl     = document.getElementById('prompt-template');
const autoSubmitEl         = document.getElementById('auto-submit');
const saveStatusEl         = document.getElementById('save-status');

// ─── State ──────────────────────────────────────────────────────
let currentSettings = { ...DEFAULTS };
let activeRecorder  = null;
let saveTimeout     = null; // Debounce timer for auto-save

// ─── Shortcut Formatting ────────────────────────────────────────
function formatShortcut(shortcut) {
  if (!shortcut || !shortcut.key) return 'Not set';
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
      selectionShortcut: currentSettings.selectionShortcut,
      urlShortcut:       currentSettings.urlShortcut,
      promptTemplate:    promptTemplateEl.value.trim() || DEFAULTS.promptTemplate,
      contentBehavior:   behaviorRadio ? behaviorRadio.value : 'replace',
      autoSubmit:        autoSubmitEl.checked
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
  }, 400); // 400ms debounce
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

  promptTemplateEl.value = settings.promptTemplate || DEFAULTS.promptTemplate;

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

  // Ignore lone modifier keys
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
  autoSave(); // Save immediately after recording a shortcut
}

// ─── Event Listeners ────────────────────────────────────────────
btnSelectionShortcut.addEventListener('click', () => {
  startRecording('selectionShortcut', btnSelectionShortcut);
});

btnUrlShortcut.addEventListener('click', () => {
  startRecording('urlShortcut', btnUrlShortcut);
});

document.addEventListener('keydown', handleRecordKeydown, true);

// Auto-save on any change to form inputs
promptTemplateEl.addEventListener('input', autoSave);
autoSubmitEl.addEventListener('change', autoSave);
document.querySelectorAll('input[name="contentBehavior"]').forEach(radio => {
  radio.addEventListener('change', autoSave);
});

// ─── Load Settings on Open ──────────────────────────────────────
chrome.storage.sync.get(DEFAULTS, (settings) => {
  currentSettings = { ...DEFAULTS, ...settings };
  populateUI(currentSettings);
});
