# Variatify

A Chrome extension that lets you control playback speed on Spotify Web Player — and remembers your preference for each song.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Speed Up (1.25x)** — Nightcore-style faster playback
- **Normal (1.0x)** — Original speed
- **Slowed (0.8x)** — Slowed + Reverb style playback
- **Per-song memory** — Automatically applies your saved preference when a song plays
- **Streaming Mode** — Apply the same speed to all songs without saving individual preferences
- **Import/Export** — Backup and restore your preferences

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/osmatrixcode/variatify.git
   cd variatify
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top right)

4. Click **Load unpacked** and select the `variatify` folder

5. Open [Spotify Web Player](https://open.spotify.com) and click the extension icon

## Usage

1. Play a song on Spotify Web Player
2. Click the Variatify extension icon
3. Choose an effect:
   - **Speed Up** — 1.25x playback
   - **Normal Speed** — 1.0x playback
   - **Slowed** — 0.8x playback
4. Your preference is automatically saved for that song

### Streaming Mode

Enable Streaming Mode to apply a single playback rate to all songs without saving per-song preferences. Useful for listening sessions where you want consistent speed.

### Backup & Restore

- **Export** — Download your preferences as a JSON file
- **Import** — Restore preferences from a backup file

## How It Works

Variatify injects scripts into the Spotify Web Player that:

1. **Intercept audio elements** as Spotify creates them
2. **Override `playbackRate`** to prevent Spotify from resetting custom speeds
3. **Detect song changes** via DOM observation and polling
4. **Store preferences** in Chrome's local storage

### Architecture

```
┌─────────────┐     chrome.tabs      ┌─────────────┐    window.postMessage   ┌─────────────┐
│   Popup     │ ──────────────────▶  │   Content   │ ────────────────────▶   │  Injected   │
│   (UI)      │ ◀──────────────────  │   Script    │ ◀────────────────────   │  Scripts    │
└─────────────┘   chrome.runtime     └─────────────┘                         └─────────────┘
                                           │
                                           ▼
                                    Chrome Storage
```

- **Popup** — User interface (buttons, toggles)
- **Content Script** — Bridge between popup and page; handles Chrome storage
- **Injected Scripts** — Run in page context to manipulate Spotify's audio elements

## Project Structure

```
variatify/
├── manifest.json           # Extension configuration
├── icons/                  # Extension icons
└── src/
    ├── popup/
    │   ├── index.html      # Popup UI
    │   ├── popup.js        # UI logic
    │   └── popup.css       # Styling
    ├── content/
    │   └── content.js      # Bridge script
    └── injected/
        ├── constants.js    # Shared constants
        ├── detector.js     # Song detection
        ├── audio.js        # Playback rate control
        └── main.js         # Main orchestration
```

## Development

### Making Changes

1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Variatify card
4. Reload any open Spotify tabs

### Key Files

| File | Purpose |
|------|---------|
| `injected/audio.js` | Overrides `HTMLMediaElement.prototype.playbackRate` |
| `injected/detector.js` | Finds current song from Spotify's DOM |
| `injected/main.js` | Handles messages, applies effects, manages state |
| `content/content.js` | Chrome storage operations, message forwarding |
| `popup/popup.js` | UI event handlers, streaming mode state |

### Storage Keys

| Key | Description |
|-----|-------------|
| `variatify_song_settings` | Object mapping song IDs to effect preferences |
| `variatify_streaming_mode` | `{ enabled: boolean, rate: string }` |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License — free to use, modify, and distribute.

## Acknowledgments

- Built for the Spotify Web Player community
- Inspired by slowed + reverb and nightcore music cultures
