window.addEventListener("message", (event) => {
  // We might receive messages from the parent frame
  if (event.data && event.data.action === "fillPrompt" && event.data.url) {
    fillPrompt(event.data.url);
  }
});

function fillPrompt(url) {
  // Try to find the textarea. 
  // ChatGPT selectors change often. 
  // currently #prompt-textarea is common, or div[contenteditable="true"]
  
  const selectors = [
    '#prompt-textarea',
    'div[contenteditable="true"]',
    'textarea[data-id="root"]'
  ];

  let textarea = null;
  for (const selector of selectors) {
    textarea = document.querySelector(selector);
    if (textarea) break;
  }

  if (!textarea) {
    console.log("Split Summary: ChatGPT textarea not found yet.");
    return;
  }

  // Check if already filled to avoid spam/double submission if we retry
  if (textarea.textContent.includes(url) || textarea.value.includes(url)) {
      return;
  }

  const promptText = `Résume-moi cet article de manière concise et structurée : ${url}`;

  // Focus
  textarea.focus();

  // Set value
  // For contenteditable div
  if (textarea.isContentEditable) {
    textarea.innerHTML = `<p>${promptText}</p>`; 
  } else {
    // For regular textarea
    textarea.value = promptText;
  }

  // Dispatch events to trigger React state updates
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  // Try to find send button and click it
  setTimeout(() => {
    const sendButton = document.querySelector('button[data-testid="send-button"]') || 
                       document.querySelector('button[aria-label="Send prompt"]');
    
    if (sendButton) {
      if (!sendButton.disabled) {
          sendButton.click();
      } else {
          // Sometimes button is disabled until input event is processed
          // Try simulated typing if direct value setting didn't enable it?
          // Usually input event is enough.
          console.log("Split Summary: Send button disabled.");
      }
    } else {
        // Alternative: simulate 'Enter' key
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13
        });
        textarea.dispatchEvent(enterEvent);
    }
  }, 500);
}
