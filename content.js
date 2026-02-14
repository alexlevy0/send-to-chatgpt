let isSplitActive = false;
let savedRatio = localStorage.getItem('splitSummaryRatio') || 50; // Percentage for the left panel

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSplit") {
    toggleSplit(request.url);
  }
});

function toggleSplit(currentUrl) {
  if (isSplitActive) {
    destroySplit();
  } else {
    createSplit(currentUrl);
  }
}

function createSplit(url) {
  if (isSplitActive) return;
  isSplitActive = true;

  // 1. Move everything currently in body to a wrapper
  const originalWrapper = document.createElement('div');
  originalWrapper.id = 'split-summary-original';
  
  // Move all body children into the wrapper
  while (document.body.firstChild) {
    originalWrapper.appendChild(document.body.firstChild);
  }

  // 2. Create the main container
  const container = document.createElement('div');
  container.id = 'split-summary-container';

  // 3. Create Divider
  const divider = document.createElement('div');
  divider.id = 'split-summary-divider';

  // 4. Create ChatGPT Panel
  const panel = document.createElement('div');
  panel.id = 'split-summary-panel';

  // Iframe
  const iframe = document.createElement('iframe');
  iframe.src = "https://chatgpt.com";
  // Important: Sandbox attributes to allow scripts but maintain some security/isolation
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
  
  // Close Button
  const closeBtn = document.createElement('button');
  closeBtn.id = 'split-summary-close';
  closeBtn.innerHTML = '✕';
  closeBtn.onclick = destroySplit;

  panel.appendChild(closeBtn);
  panel.appendChild(iframe);

  // 5. Assemble
  container.appendChild(originalWrapper);
  container.appendChild(divider);
  container.appendChild(panel);
  document.body.appendChild(container);

  // 6. Apply saved ratio
  setRatio(savedRatio);

  // 7. Initialize Drag Event
  initDrag(divider, container);

  // 8. Wait for iframe load to send prompt
  // We use postMessage to communicate with the bridge script inside the iframe
  iframe.onload = () => {
    // Send message immediately after load
    setTimeout(() => {
        iframe.contentWindow.postMessage({ action: "fillPrompt", url: url }, "*");
    }, 2000); // Wait a bit for React to hydrate

    // Retry a few times just in case
    let attempts = 0;
    const interval = setInterval(() => {
        if (!isSplitActive || attempts > 5) {
            clearInterval(interval);
            return;
        }
        iframe.contentWindow.postMessage({ action: "fillPrompt", url: url }, "*");
        attempts++;
    }, 3000);
  };
}

function destroySplit() {
  if (!isSplitActive) return;
  
  const container = document.getElementById('split-summary-container');
  const originalWrapper = document.getElementById('split-summary-original');

  if (container && originalWrapper) {
    // Restore body
    while (originalWrapper.firstChild) {
      document.body.appendChild(originalWrapper.firstChild);
    }
    container.remove();
  }
  
  isSplitActive = false;
}

function setRatio(leftPercent) {
  const container = document.getElementById('split-summary-container');
  if (!container) return;
  
  const p = Math.max(20, Math.min(80, leftPercent)); // Clamp between 20% and 80%
  const originalWrapper = document.getElementById('split-summary-original');
  const panel = document.getElementById('split-summary-panel');
  
  originalWrapper.style.flexBasis = `${p}%`;
  panel.style.flexBasis = `${100 - p}%`;
  
  localStorage.setItem('splitSummaryRatio', p);
  savedRatio = p;
}

function initDrag(divider, container) {
  let isDragging = false;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    divider.classList.add('dragging');
    e.preventDefault(); // Prevent text selection
    
    // Transparent overlay to prevent iframe stealing mouse events
    const overlay = document.createElement('div');
    overlay.id = 'split-drag-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '2147483650';
    overlay.style.cursor = 'col-resize';
    document.body.appendChild(overlay);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const windowWidth = window.innerWidth;
    const x = e.clientX;
    const percent = (x / windowWidth) * 100;
    
    setRatio(percent);
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      divider.classList.remove('dragging');
      const overlay = document.getElementById('split-drag-overlay');
      if (overlay) overlay.remove();
    }
  });
}
