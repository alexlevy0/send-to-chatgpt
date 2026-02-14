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

-   **ChatGPT not loading?** Ensure you are logged in to `https://chatgpt.com`.
-   **Prompt not filling?** ChatGPT selectors change often. The extension tries to find the input field, but if OpenAI updates their UI, this feature might temporarily break until updated.
