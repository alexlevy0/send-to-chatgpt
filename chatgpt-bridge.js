console.log("Split Summary: Bridge script loaded.");

window.addEventListener("message", (event) => {
  console.log("Split Summary: Message received", event.data);
  if (event.data && event.data.action === "fillPrompt" && event.data.url) {
    fillPrompt(event.data.url);
  }
});

let lastProcessedUrl = "";

function fillPrompt(url) {
  if (url === lastProcessedUrl) {
      console.log("Split Summary: URL already processed, skipping.");
      return;
  }
  
  console.log("Split Summary: Attempting to fill prompt...");
  
  const selectors = [
    '#prompt-textarea',
    'div[contenteditable="true"]',
    'textarea[data-id="root"]',
    'div[id="prompt-textarea"]'
  ];

  let textarea = null;
  for (const selector of selectors) {
    textarea = document.querySelector(selector);
    if (textarea) break;
  }

  if (!textarea) {
    console.warn("Split Summary: ChatGPT textarea not found.");
    return;
  }

  // Check if already filled (legacy check)
  if (textarea.textContent.includes(url) || (textarea.value && textarea.value.includes(url))) {
      console.log("Split Summary: Already filled.");
      lastProcessedUrl = url; // Mark as processed
      return;
  }

  // Detect browser language (e.g., "en-US", "fr-FR")
  const lang = navigator.language || navigator.userLanguage || 'en';
  
  let promptText = `Summarize this article concisely and specifically: ${url}`; // Default English

  if (lang.startsWith('fr')) {
      promptText = `Résume-moi cet article de manière concise et structurée : ${url}`;
  } else if (lang.startsWith('es')) {
      promptText = `Resume este artículo de manera concisa y estructurada: ${url}`;
  } else if (lang.startsWith('de')) {
      promptText = `Fasse diesen Artikel kurz und strukturiert zusammen: ${url}`;
  } else if (lang.startsWith('it')) {
      promptText = `Riassumi questo articolo in modo conciso e strutturato: ${url}`;
  } else if (lang.startsWith('pt')) {
      promptText = `Resuma este artigo de forma concisa e estruturada: ${url}`;
  } else if (lang.startsWith('zh')) {
      promptText = `简明扼要地总结这篇文章：${url}`;
  } else if (lang.startsWith('ja')) {
      promptText = `この記事を簡潔に構造化して要約してください：${url}`;
  } else if (lang.startsWith('ru')) {
      promptText = `Кратко и структурировано перескажи эту статью: ${url}`;
  }

  textarea.focus();
  
  // Method 1: Try execCommand (most native-like)
  // This usually triggers all necessary internal events for React/ProseMirror
  const success = document.execCommand('insertText', false, promptText);
  
  // Method 2: Fallback if execCommand failed or didn't work as expected
  if (!success && textarea.textContent !== promptText) {
      console.log("Split Summary: execCommand failed, using fallback...");
      if (textarea.isContentEditable) {
        textarea.innerHTML = `<p>${promptText}</p>`; 
      } else {
        textarea.value = promptText;
      }
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
  }

  console.log("Split Summary: Text filled. Waiting for button...");

  // Send logic
  // Send logic
  setTimeout(() => {
    const sendButton = document.querySelector('button[data-testid="send-button"]') || 
                       document.querySelector('button[aria-label="Send prompt"]');

    if (sendButton && !sendButton.disabled) {
        console.log("Split Summary: Clicking send button.");
        sendButton.click();
    } else {
        console.log("Split Summary: Send button not ready/found. Simulating Enter key...");
        
        // Focus is critical
        textarea.focus();
        
        const eventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            charCode: 13,
            composed: true
        };

        textarea.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        textarea.dispatchEvent(new KeyboardEvent('keypress', eventInit));
        textarea.dispatchEvent(new KeyboardEvent('keyup', eventInit));
    }
    
    // Mark as successfully processed
    lastProcessedUrl = url;
  }, 1000);
}
