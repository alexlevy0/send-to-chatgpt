# Send to ChatGPT Chrome Extension

A powerful Chrome extension that allows you to instantly send selected text or the current page URL to a ChatGPT side panel using customizable keyboard shortcuts.

## ✨ Features

- **⌨️ Custom Keyboard Shortcuts**: Define your own shortcuts for sending the current URL or selected text (Defaults: `Ctrl+Shift+U` for URL, `Ctrl+Shift+S` for Selection).
- **📝 Prompt Templates**: Customize exactly how your text is sent to ChatGPT using placeholders (`{url}`, `{selection}`). Includes multi-language default support.
- **⚙️ Advanced Behavior**: 
  - Choose whether to **replace** the current ChatGPT input or **append** to it.
  - Optional **Auto-submit** to instantly send the prompt to ChatGPT.
- **🌗 Side Panel Interface**: Opens ChatGPT seamlessly on the right side of your screen. 
  - **Draggable Divider**: Adjust the width of the panel to your liking.
  - **Memory**: Remembers your preferred panel width.
  - **Secure Integration**: Automatically patches cookies to keep your existing ChatGPT session active within the panel.
- **🛠️ Settings UI**: A clean, modern popup interface to manage all your configurations, including a shortcut recorder.

## 🚀 Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `send-to-chatgpt` directory from this project.

## 💻 Usage

1. Navigate to any article or webpage you want to interact with.
2. Ensure you are logged into [ChatGPT](https://chatgpt.com) in another tab if you haven't already.
3. **Send URL**: Press `Ctrl+Shift+U` (or your configured shortcut) to open ChatGPT and automatically paste the URL with your prompt template.
4. **Send Selection**: Highlight any text on the page and press `Ctrl+Shift+S` to send the selected text.
5. **Settings**: Click the extension icon in your toolbar to open the settings popup and customize your templates, shortcuts, and behavior.
6. **Close**: Press `Escape` or click the `✕` button on the side panel to close it.

## 🔒 Permissions Justification

When submitting to the Chrome Web Store, use the following justifications:

- **`activeTab`**: Allows the extension to read the current tab's URL and selected text only when explicitly triggered by a keyboard shortcut.
- **`storage`**: Saves your custom settings (shortcuts, templates, behaviors) and syncs them across your browsers.
- **`declarativeNetRequest`**: Necessary to remove `X-Frame-Options` and `Content-Security-Policy` headers from `chatgpt.com`, enabling it to be embedded inside the side panel.
- **`cookies`**: Modifies specific `chatgpt.com` and `openai.com` cookies to `SameSite=None` so your authentication persists within the cross-origin iframe. No cookies are read or collected.
- **Host Permissions** (`*://chatgpt.com/*`, `*://*.openai.com/*`): Required to target the specific modifications described above strictly to ChatGPT domains.

## 🎯 Single Purpose Description

The single purpose of this extension is to **facilitate side-by-side reading and interaction with ChatGPT**. It splits the user's current browser tab into two panels: the original article on the left and a ChatGPT interface on the right, automatically prompting ChatGPT with the visible content or URL. It does not perform any other background activities or data collection.
