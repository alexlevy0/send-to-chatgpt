# Send to ChatGPT Chrome Extension

A Chrome extension that splits your current tab, opening ChatGPT on the side to automatically summarize the article you're reading.

## Features

- **Split View**: View your article and ChatGPT side-by-side.
- **Auto-Prompt**: Automatically fills ChatGPT with "Résume-moi cet article : [URL]".
- **Draggable Divider**: Adjust the width of the panels.
- **Session Memory**: Remembers your preferred split ratio.

## Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `split-summary` directory from this project.

## Usage

1.  Navigate to any article or webpage you want to summarize.
2.  Click the **Split Summary** icon in your extension toolbar.
3.  The page will split, opening ChatGPT on the right.
4.  The prompt will be automatically filled and (if possible) sent.
    -   *Note*: You may need to log in to ChatGPT first.
5.  To close, click the **X** button or click the extension icon again.

## Troubleshooting

-   **Prompt not filling?** ChatGPT selectors change often. The extension tries to find the input field, but if OpenAI updates their UI, this feature might temporarily break until updated.

## Permissions Justification

When submitting to the Chrome Web Store, use the following justifications:

-   **`activeTab`**: Used to inject the content script and CSS into the current tab *only* when the user clicks the extension icon. This ensures the extension accesses page content only when explicitly triggered by the user.
-   **`scripting`**: used to inject the content script and CSS into the tab when the user clicks the action button. This allows the extension to modify the page layout (creating the split view) dynamically without requiring broad host permissions for every site upfront.
-   **`declarativeNetRequest`**: This permission is critical to allow the extension to display ChatGPT in a side panel (iframe) alongside the user's content. It is used solely to remove the `X-Frame-Options` and `Content-Security-Policy` headers from `chatgpt.com` responses, which otherwise prevent the site from being embedded.
-   **`cookies`**: The extension displays ChatGPT in an iframe. By default, third-party cookie restrictions prevent the user's existing ChatGPT session from working inside this iframe. This permission is used **only** to modify the `SameSite` attribute of specific `chatgpt.com` and `openai.com` cookies to `None`, allowing the user to remain authenticated within the side panel. No cookies are read, stored, or transmitted to any other server.
-   **`Host Permissions`** (`*://chatgpt.com/*`, `*://*.openai.com/*`): Required to:
    1.  Target modifications (header stripping and cookie patching) specifically to ChatGPT domains.
    2.  Inject the automation script (`chatgpt-bridge.js`) only into the ChatGPT iframe to handle prompt filling.

## Single Purpose Description

The single purpose of this extension is to **facilitate side-by-side reading and summarization**. It splits the user's current browser tab into two panels: the original article on the left and a ChatGPT interface on the right, automatically prompting ChatGPT to summarize the visible content. It does not perform any other background activities or data collection.
