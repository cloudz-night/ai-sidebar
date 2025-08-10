# AI Sidebar (Electron) – Multi‑Provider Chat + Translation

A minimalist, fast chat and translation app with a clean sidebar UI. It supports GPT (OpenAI), Mistral, and Google Gemini with sticky header/input, multiple chats, and a frameless Electron window.

## Features

- Multi‑provider: GPT (OpenAI), Mistral, Gemini
- Chat with persistent history (localStorage), multi‑chat sidebar (New Chat, Clear All)
- Sticky top navigation and input bar (always visible while scrolling)
- Overlay sidebar that auto‑hides on outside click
- Model selector with provider icon (GPT/Mistral/Gemini)
- Translation panel with language swap and provider‑backed translation
- Settings page to enter/save API keys (stored locally)
- Markdown + syntax highlighting for AI responses
- Frameless Electron window (no native title/menu bars), draggable custom top bar

## Quick Start

### 1) Install requirements

- Node.js 18+ and npm
- You can install Node.js from here: https://nodejs.org/en

### 2) Install dependencies

```bash
npm install
```

### 3) Start the Electron app

```bash
npm start
```

If you don’t have a start script, run:

```bash
npx electron .
```

### 4) (Optional) Run in a browser

Open `index.html` directly in a browser. Note: some provider requests may be blocked by CORS in the browser. Electron mode is recommended for full functionality.

## API Keys

You need an API key for at least one provider (whichever you select):

- GPT (OpenAI): https://platform.openai.com/api-keys
- Mistral: https://console.mistral.ai/
- Gemini: https://aistudio.google.com/app/apikey

Add the key in one of two ways:

- In‑app: go to the `settings` tab → paste your key(s) → Save
- Config file: edit `config.js` and set the `apiKey` for the chosen provider(s)

Keys are saved locally (localStorage for in‑app, plain text for `config.js`). Never commit real keys to version control.

## Usage

- Tabs (top):
  - Intelligence: chat interface
  - Translate: translation panel (source/target languages, swap, translate)
  - Settings: enter API keys and save
- Sidebar (left): manage chats (New Chat, Clear All). Sidebar overlays the content and auto‑hides on outside click.
- Input (bottom): always visible, model selector + send button on the right.
- Keyboard:
  - Enter to send
  - Shift + Enter for a new line

### Translation

- Open the `translate` tab
- Pick source (“Auto‑detect” supported) and target languages
- Type text and click `Translate`
- The currently selected provider is used for translation

## Project Structure

```
ai-sidebar/
├── index.html        # App shell (tabs: intelligence/translate/settings)
├── style.css         # Theme, layout, sticky header/input, sidebar, translation styles
├── script.js         # UI logic (chat, sidebar, sections, settings, translation)
├── ai-services.js    # Provider calls + translation
├── config.js         # Provider configuration and API keys (do not commit real keys)
├── main.js           # Electron entry (frameless window)
└── assets/           # Icons (ai, translate, settings, provider icons)
```

## Troubleshooting

- No output / errors:
  - Ensure you saved a valid API key in Settings or `config.js`
  - Verify network access and provider status/credits
- CORS errors in browser:
  - Use Electron (`npm start`) instead of opening the file directly
- Can’t type after clearing chats (Electron):
  - Fixed in app: the input is re‑enabled and focused after Clear All and on window focus
- Input/Top not visible:
  - They are fixed/sticky by design; if overlapped, resize window or collapse the sidebar

## Security

- Keys set in the app are stored in localStorage
- Consider environment variables or a secure storage for production builds

## License

MIT – Do as you wish. Please remove or rotate any demo keys before sharing.

