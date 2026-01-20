# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Variatify (formerly Tunevo) is a Chrome extension that modifies Spotify Web Player playback rates. It allows users to apply audio effects like Speed Up (1.25x), Normal (1.0x), and Slowed (0.8x) to songs, with per-song settings that are remembered.

## Architecture

This is a Chrome Extension (Manifest V3) with three main script contexts:

### Script Contexts & Communication Flow

```
Popup (popup.js)
    ↓ chrome.tabs.sendMessage
Content Script (load-main.js)
    ↓ window.postMessage
Injected Script (main.js) ← Runs in page context, can access Spotify's audio elements
```

1. **Background Service Worker** (`src/background.js`): Initializes ExtPay for payment processing
2. **Content Script** (`src/content/load-main.js`): Bridge between popup and injected script. Handles Chrome storage operations and message forwarding
3. **Injected Script** (`src/injected/main.js`): Runs in page context to intercept and modify HTMLMediaElement playback. Contains core audio manipulation logic
4. **Popup** (`src/popup/popup.js`): User interface for controls, streaming mode toggle, and payment management

### Key Mechanisms

- **Playback Rate Control**: Overrides `HTMLMediaElement.prototype.playbackRate` setter to prevent Spotify from resetting custom rates
- **Song Detection**: Monitors DOM changes and page title to detect song changes, then applies saved settings
- **Streaming Mode**: Applies a global playback rate to all songs without saving per-song preferences
- **Storage**: Uses `chrome.storage.local` with key `tunevo_song_settings` for per-song settings and `tunevo_streaming_mode` for streaming state

### Payment Integration

Uses ExtPay (extensionpay.com) for trial/payment handling. Authentication status is passed through all script contexts via message passing.

## Development

### Loading the Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `variatify` directory

### Testing Changes

After code changes, reload the extension in `chrome://extensions/` and refresh any open Spotify tabs.

### Key Files

- `manifest.json`: Extension configuration, permissions, content script matches
- `src/injected/main.js`: Core playback manipulation - the main logic lives here
- `src/content/load-main.js`: Chrome API bridge and storage operations
- `src/popup/popup.js`: All UI logic and user interaction handling

### Storage Keys

- `tunevo_song_settings`: Object mapping song IDs (lowercase song titles) to effect objects
- `tunevo_streaming_mode`: `{ enabled: boolean, rate: 'slowed' | 'normal' | 'speedUp' }`

### Effect Values

| Effect | Rate | preservesPitch |
|--------|------|----------------|
| speedUp | 1.25 | false |
| normalSpeed | 1.0 | true |
| slowed | 0.8 | false |
