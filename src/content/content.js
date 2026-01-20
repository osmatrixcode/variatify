// Variatify Content Script
// Bridge between popup and injected scripts, handles Chrome storage operations

// Constants
const STORAGE_KEYS = {
  SONG_SETTINGS: 'variatify_song_settings',
  STREAMING_MODE: 'variatify_streaming_mode',
  LEGACY_SONG_SETTINGS: 'tunevo_song_settings',
  LEGACY_STREAMING_MODE: 'tunevo_streaming_mode'
};

const SOURCE = {
  INJECTED: 'injected-script',
  CONTENT: 'content-script',
  POPUP: 'popup'
};

// Migrate legacy storage keys on load
async function migrateStorage() {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.LEGACY_SONG_SETTINGS,
      STORAGE_KEYS.LEGACY_STREAMING_MODE
    ]);

    // Migrate song settings
    if (result[STORAGE_KEYS.LEGACY_SONG_SETTINGS]) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SONG_SETTINGS]: result[STORAGE_KEYS.LEGACY_SONG_SETTINGS]
      });
      await chrome.storage.local.remove(STORAGE_KEYS.LEGACY_SONG_SETTINGS);
      console.log('Variatify: Migrated song settings from legacy storage');
    }

    // Migrate streaming mode
    if (result[STORAGE_KEYS.LEGACY_STREAMING_MODE]) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.STREAMING_MODE]: result[STORAGE_KEYS.LEGACY_STREAMING_MODE]
      });
      await chrome.storage.local.remove(STORAGE_KEYS.LEGACY_STREAMING_MODE);
      console.log('Variatify: Migrated streaming mode from legacy storage');
    }
  } catch (error) {
    console.error('Variatify: Migration error:', error);
  }
}

// Run migration on load
migrateStorage();

// Inject the scripts into the page context
function injectScript(file) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(file);
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject scripts in order: constants -> detector -> audio -> main
injectScript('src/injected/constants.js');
injectScript('src/injected/detector.js');
injectScript('src/injected/audio.js');
injectScript('src/injected/main.js');

// Storage functions
async function saveSongSetting(songId, effect) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SONG_SETTINGS);
    const songSettings = result[STORAGE_KEYS.SONG_SETTINGS] || {};
    songSettings[songId] = effect;
    await chrome.storage.local.set({ [STORAGE_KEYS.SONG_SETTINGS]: songSettings });
    return true;
  } catch (error) {
    console.error('Variatify: Error saving song setting:', error);
    return false;
  }
}

async function loadSongSetting(songId) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SONG_SETTINGS);
    const songSettings = result[STORAGE_KEYS.SONG_SETTINGS] || {};
    return songSettings[songId] || null;
  } catch (error) {
    console.error('Variatify: Error loading song setting:', error);
    return null;
  }
}

async function clearSongSetting(songId) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SONG_SETTINGS);
    const songSettings = result[STORAGE_KEYS.SONG_SETTINGS] || {};
    delete songSettings[songId];
    await chrome.storage.local.set({ [STORAGE_KEYS.SONG_SETTINGS]: songSettings });
    return true;
  } catch (error) {
    console.error('Variatify: Error clearing song setting:', error);
    return false;
  }
}

async function listAllSavedSettings() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SONG_SETTINGS);
    return result[STORAGE_KEYS.SONG_SETTINGS] || {};
  } catch (error) {
    console.error('Variatify: Error listing saved settings:', error);
    return {};
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.source !== SOURCE.POPUP) return;

  if (request.action === 'getCurrentSong') {
    // Forward to injected script isn't needed - we don't have getCurrentSongInfo here anymore
    // The popup will get song info through the injected script
    sendResponse({ songInfo: { title: 'Loading...' } });
  } else if (['getCurrentSetting', 'clearCurrentSetting', 'listAllSettings'].includes(request.action)) {
    // Forward to injected script and keep channel open for response
    window.postMessage({
      action: request.action,
      source: SOURCE.CONTENT
    }, '*');
    return true; // Keep message channel open
  } else if (['enableStreamingMode', 'disableStreamingMode', 'updateStreamingRate'].includes(request.action)) {
    // Forward streaming mode messages to injected script
    window.postMessage({
      action: request.action,
      data: request.data,
      source: SOURCE.CONTENT
    }, '*');
    sendResponse({ status: 'Message forwarded' });
  } else {
    // Forward other messages to injected script
    window.postMessage({
      action: request.action,
      source: SOURCE.CONTENT
    }, '*');
    sendResponse({ status: 'Message forwarded' });
  }
});

// Listen for messages from injected script
window.addEventListener('message', function(event) {
  if (event.data.source !== SOURCE.INJECTED) return;

  // Handle storage operations
  switch (event.data.action) {
    case 'saveSongSetting':
      saveSongSetting(event.data.songId, event.data.effect).then(success => {
        window.postMessage({
          source: SOURCE.CONTENT,
          action: 'saveSongSettingResponse',
          success: success
        }, '*');
      });
      break;

    case 'loadSongSetting':
      loadSongSetting(event.data.songId).then(setting => {
        window.postMessage({
          source: SOURCE.CONTENT,
          action: 'loadSongSettingResponse',
          songId: event.data.songId,
          setting: setting
        }, '*');
      });
      break;

    case 'clearSongSetting':
      clearSongSetting(event.data.songId).then(success => {
        window.postMessage({
          source: SOURCE.CONTENT,
          action: 'clearSongSettingResponse',
          songId: event.data.songId,
          success: success
        }, '*');
      });
      break;

    case 'listAllSettings':
      listAllSavedSettings().then(settings => {
        window.postMessage({
          source: SOURCE.CONTENT,
          action: 'listAllSettingsResponse',
          settings: settings
        }, '*');
      });
      break;

    // Forward responses to popup
    case 'currentSetting':
    case 'settingCleared':
    case 'allSettings':
      chrome.runtime.sendMessage({
        source: SOURCE.CONTENT,
        action: event.data.action,
        data: event.data
      });
      break;

    case 'songChanged':
      chrome.runtime.sendMessage({
        source: SOURCE.CONTENT,
        action: 'songChanged',
        songInfo: event.data.songInfo
      });
      break;
  }
});
