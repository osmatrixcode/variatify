// Variatify Constants
// Shared constants used across the extension

const VARIATIFY = {
  // Storage keys
  STORAGE: {
    SONG_SETTINGS: 'variatify_song_settings',
    STREAMING_MODE: 'variatify_streaming_mode',
    // Legacy keys for migration
    LEGACY_SONG_SETTINGS: 'tunevo_song_settings',
    LEGACY_STREAMING_MODE: 'tunevo_streaming_mode'
  },

  // Effect definitions
  EFFECTS: {
    SPEED_UP: { rate: 1.25, pitch: false, name: 'speedUp' },
    NORMAL: { rate: 1.0, pitch: true, name: 'normalSpeed' },
    SLOWED: { rate: 0.8, pitch: false, name: 'slowed' }
  },

  // Message sources
  SOURCE: {
    INJECTED: 'injected-script',
    CONTENT: 'content-script',
    POPUP: 'popup'
  },

  // Timeouts (in milliseconds)
  TIMEOUTS: {
    INIT_DELAY: 2000,
    POLL_INTERVAL: 1000,
    MESSAGE_TIMEOUT: 1000,
    SAVE_RESPONSE_TIMEOUT: 2000
  },

  // Spotify DOM selectors for song detection
  SELECTORS: {
    SONG_TITLE: [
      '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]',
      '[data-testid="context-item-info-title"]',
      '.now-playing-bar [data-testid="context-item-info-title"]',
      '.now-playing-bar .track-info__name',
      '[data-testid="track-info"] [data-testid="context-item-info-title"]',
      '.track-info__name'
    ]
  }
};
