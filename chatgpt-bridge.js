console.log("Split Summary: Bridge script loaded.");

window.addEventListener("message", (event) => {
  console.log("Split Summary: Message received", event.data);
  if (event.data && event.data.action === "fillPrompt" && event.data.url) {
    fillPrompt(event.data.url);
  }
});

function fillPrompt(url) {
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

  // Check if already filled
  if (textarea.textContent.includes(url) || (textarea.value && textarea.value.includes(url))) {
      console.log("Split Summary: Already filled.");
      return;
  }

  const promptText = `Résume-moi cet article de manière concise et structurée : ${url}`;

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
  setTimeout(() => {
    const sendButton = document.querySelector('button[data-testid="send-button"]') || 
                       document.querySelector('button[aria-label="Send prompt"]');
    
    // Try button click first if available and enabled
    if (sendButton && !sendButton.disabled) {
        console.log("Split Summary: Clicking send button.");
        sendButton.click();
    } else {
        // Fallback or Force Enter
        console.log("Split Summary: Simulating Enter key...");
        
        const eventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            key: 'Enter',
            code: 'Enter',
            location: 0,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            keyCode: 13,
            which: 13,
            charCode: 13,
            composed: true
        };

        const keydown = new KeyboardEvent('keydown', eventInit);
        textarea.dispatchEvent(keydown);
        
        const keypress = new KeyboardEvent('keypress', eventInit);
        textarea.dispatchEvent(keypress);
        
        const keyup = new KeyboardEvent('keyup', eventInit);
        textarea.dispatchEvent(keyup);
    }
  }, 500);
}
