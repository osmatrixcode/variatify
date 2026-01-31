# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Variatify is a Chrome extension that modifies Spotify Web Player playback rates. It allows users to apply audio effects like Speed Up (1.25x), Normal (1.0x), and Slowed (0.8x) to songs, with per-song settings that are remembered.

## Architecture

Chrome Extension (Manifest V3) with three script contexts:

### Communication Flow

```
Popup (popup.js)
    ↓ chrome.tabs.sendMessage
Content Script (content.js)
    ↓ window.postMessage
Injected Scripts (page context) ← Can access Spotify's audio elements
```

1. **Content Script** (`src/content/content.js`): Bridge between popup and injected scripts. Handles Chrome storage operations and message forwarding. Injects scripts in order.
2. **Injected Scripts** (`src/injected/`): Run in page context to manipulate Spotify's audio:
   - `constants.js`: Shared constants, effect definitions, DOM selectors
   - `detector.js`: Finds current song from Spotify's DOM
   - `audio.js`: Overrides `HTMLMediaElement.prototype.playbackRate`
   - `main.js`: Orchestrates state, handles messages, applies effects
3. **Popup** (`src/popup/popup.js`): User interface for controls and streaming mode toggle

### Key Mechanisms

- **Playback Rate Control**: Overrides `HTMLMediaElement.prototype.playbackRate` setter to prevent Spotify from resetting custom rates
- **Song Detection**: Monitors DOM changes via MutationObserver and polls to detect song changes, then applies saved settings
- **Streaming Mode**: Applies a global playback rate to all songs without saving per-song preferences

## Development

### Loading the Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `variatify` directory

### Testing Changes

After code changes, reload the extension in `chrome://extensions/` and refresh any open Spotify tabs.

### Storage Keys

- `variatify_song_settings`: Object mapping song IDs (lowercase song titles) to effect objects
- `variatify_streaming_mode`: `{ enabled: boolean, rate: 'slowed' | 'normal' | 'speedUp' }`

Legacy keys (`tunevo_*`) are auto-migrated on load.

### Effect Values

| Effect | Rate | preservesPitch |
|--------|------|----------------|
| speedUp | 1.25 | false |
| normalSpeed | 1.0 | true |
| slowed | 0.8 | false |
