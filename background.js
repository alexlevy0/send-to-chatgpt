const TARGET_DOMAINS = ["chatgpt.com", ".chatgpt.com", "openai.com", ".openai.com"];

async function fixCookies() {
  try {
    // We need to allow cookies in the iframe (cross-site).
    // By default, SameSite=Lax prevent them from sending.
    // We change them to SameSite=None and Secure.
    
    // We can't query by domain list directly, so we query simply for the URL logic or loop known domains
    // A broader query:
    const cookies = await chrome.cookies.getAll({}); 
    
    for (const cookie of cookies) {
      if (cookie.domain.includes("chatgpt.com") || cookie.domain.includes("openai.com")) {
         if (cookie.sameSite !== 'no_restriction') {
            const url = "https://" + cookie.domain.replace(/^\./, '') + cookie.path;
            
            const newCookie = {
              url: url,
              name: cookie.name,
              value: cookie.value,
              path: cookie.path,
              secure: true,
              httpOnly: cookie.httpOnly,
              expirationDate: cookie.expirationDate,
              storeId: cookie.storeId,
              sameSite: 'no_restriction'
            };

            // __Host- cookies must NOT have a domain attribute
            if (!cookie.name.startsWith("__Host-")) {
                newCookie.domain = cookie.domain;
            }
            
            await chrome.cookies.set(newCookie);
         }
      }
    }
    console.log("Cookies patched for iframe access.");
  } catch (e) {
    console.error("Cookie fix failed:", e);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  // Attempt to fix cookies before opening
  await fixCookies();

  // Check if we can inject scripts
  try {
    // Try to send a message first. If it fails, the script isn't there.
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "toggleSplit", url: tab.url });
    } catch (e) {
      // Script not injected, inject it now
      console.log("Script not injected, injecting now...");
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content.css"]
      });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });

      // Retry sending the message
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "toggleSplit", url: tab.url });
      }, 100);
    }
  } catch (err) {
    console.error("Failed to inject script or send message:", err);
  }
});
