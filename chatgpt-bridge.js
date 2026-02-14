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

  // Handle contenteditable (ProseMirror used by ChatGPT)
  if (textarea.isContentEditable) {
    // React ProseMirror often requires setting innerHTML of the paragraph inside
    // Or simpler: just set textContent but that might break formatting
    // Let's try inserting a paragraph
    textarea.innerHTML = `<p>${promptText}</p>`;
  } else {
    textarea.value = promptText;
  }

  // Dispatch events
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  console.log("Split Summary: Text filled. Waiting for button...");

  // Send button logic
  setTimeout(() => {
    const sendButton = document.querySelector('button[data-testid="send-button"]') || 
                       document.querySelector('button[aria-label="Send prompt"]');
    
    if (sendButton) {
        if (!sendButton.disabled) {
            console.log("Split Summary: Clicking send button.");
            sendButton.click();
        } else {
            console.warn("Split Summary: Send button disabled.");
        }
    } else {
        console.warn("Split Summary: Send button not found. Trying Enter key...");
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13
        });
        textarea.dispatchEvent(enterEvent);
    }
  }, 800);
}
