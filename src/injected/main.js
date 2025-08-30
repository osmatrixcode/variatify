//intercept new audio and video elements
const originalCreateElement = document.createElement;
const spotifyPlaybackEls = [];

// State management for current effect
let currentEffect = {
  rate: 1.00,
  pitch: true,
  name: 'normal speed'
};

// Current song tracking
let currentSongId = null;



// Local storage functions for song settings
function getSongId(title, artist) {
  return `${title} - ${artist}`.toLowerCase().trim();
}

function saveSongSetting(songId, effect) {
  try {
    const songSettings = JSON.parse(localStorage.getItem('tunevo_song_settings') || '{}');
    songSettings[songId] = effect;
    localStorage.setItem('tunevo_song_settings', JSON.stringify(songSettings));
    console.log(`💾 Saved setting for "${songId}":`, effect);
  } catch (error) {
    console.error('Error saving song setting:', error);
  }
}

function loadSongSetting(songId) {
  try {
    const songSettings = JSON.parse(localStorage.getItem('tunevo_song_settings') || '{}');
    const setting = songSettings[songId];
    if (setting) {
      console.log(`📂 Loaded setting for "${songId}":`, setting);
      return setting;
    }
  } catch (error) {
    console.error('Error loading song setting:', error);
  }
  return null;
}

function getCurrentSongInfo() {
  try {
    // Try multiple selectors to find song info on Spotify
    const selectors = [
      '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]',
      '[data-testid="context-item-info-title"]',
      '.now-playing-bar [data-testid="context-item-info-title"]',
      '.now-playing-bar .track-info__name',
      '.now-playing-bar .track-info__artists',
      '[data-testid="track-info"] [data-testid="context-item-info-title"]',
      '.track-info__name',
      '.track-info__artists'
    ];

    let title = 'Not playing';
    let artist = 'Spotify';

    // Try to find title
    for (let selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        title = element.textContent.trim();
        break;
      }
    }

    // Try to find artist (look for elements near the title)
    const artistSelectors = [
      '[data-testid="context-item-info-subtitle"]',
      '[data-testid="now-playing-widget"] [data-testid="context-item-info-subtitle"]',
      '.now-playing-bar [data-testid="context-item-info-subtitle"]',
      '.track-info__artists',
      '.now-playing-bar .track-info__artists',
      '[data-testid="track-info"] [data-testid="context-item-info-subtitle"]',
      '.track-info__artists a',
      '.now-playing-bar .track-info__artists a',
      '[data-testid="context-item-info-subtitle"] a',
      '.Type__TypeElement-sc-goli3j-0[data-encore-id="type"]'
    ];

    for (let selector of artistSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        artist = element.textContent.trim();
        break;
      }
    }

    // If still not found, try to find any element with artist-like text
    if (artist === 'Spotify') {
      const allElements = document.querySelectorAll('*');
      for (let element of allElements) {
        const text = element.textContent.trim();
        if (text && text.length > 0 && text.length < 100 && 
          !text.includes('Spotify') && !text.includes('Premium') && 
          !text.includes('Play') && !text.includes('Pause') &&
          text !== title && text.includes(' ')) {
          // This might be an artist name
          artist = text;
          break;
        }
      }
    }

    // Fallback: try to get from page title
    if (title === 'Not playing') {
      const pageTitle = document.title;
      if (pageTitle && pageTitle.includes(' - ')) {
        const parts = pageTitle.split(' - ');
        if (parts.length >= 2) {
          title = parts[0].trim();
          artist = parts[1].replace(' | Spotify', '').trim();
        }
      }
    }

    return { title, artist };
  } catch (error) {
    console.error('Error getting song info:', error);
    return { title: 'Not playing', artist: 'Spotify' };
  }
}

function checkForSongChange() {
  const songInfo = getCurrentSongInfo();
  const newSongId = getSongId(songInfo.title, songInfo.artist);
  
  if (newSongId !== currentSongId && songInfo.title !== 'Not playing') {
    console.log(`🎵 Song changed from "${currentSongId}" to "${newSongId}"`);
    currentSongId = newSongId;
    
    // Load and apply saved setting for this song
    const savedSetting = loadSongSetting(newSongId);
    if (savedSetting) {
      console.log(`🔄 Applying saved setting for "${newSongId}":`, savedSetting);
      applyEffectByName(savedSetting.name);
    } else {
      console.log(`📝 No saved setting found for "${newSongId}", resetting to normal speed`);
      // Reset to normal speed when no saved setting (don't save this as a setting)
      applyNormalSpeedWithoutSaving();
    }
  }
  
  // Debug: Log current song info periodically (less verbose)
  if (songInfo.title !== 'Not playing' && Math.random() < 0.1) { // Only log 10% of the time
    console.log(`🎵 Currently playing: "${songInfo.title}" by "${songInfo.artist}" (ID: ${newSongId})`);
  }
}

function applyEffectByName(effectName) {
  switch(effectName) {
    case 'speedUp':
      speedUp();
      break;
    case 'normalSpeed':
      normalSpeed();
      break;
    case 'slowed':
      slowed();
      break;
    default:
      console.log('Unknown effect name:', effectName);
  }
}

function getCurrentSongSetting() {
  if (!currentSongId) return null;
  return loadSongSetting(currentSongId);
}

function clearSongSetting(songId) {
  try {
    const songSettings = JSON.parse(localStorage.getItem('tunevo_song_settings') || '{}');
    delete songSettings[songId];
    localStorage.setItem('tunevo_song_settings', JSON.stringify(songSettings));
    console.log(`🗑️ Cleared setting for "${songId}"`);
  } catch (error) {
    console.error('Error clearing song setting:', error);
  }
}

function listAllSavedSettings() {
  try {
    const songSettings = JSON.parse(localStorage.getItem('tunevo_song_settings') || '{}');
    console.log('📋 All saved song settings:', songSettings);
    return songSettings;
  } catch (error) {
    console.error('Error listing saved settings:', error);
    return {};
  }
}

document.createElement = function (tagName, ...args) {
  const el = originalCreateElement.call(this, tagName, ...args);
  if (tagName === "audio" || tagName === "video") {
    spotifyPlaybackEls.push(el);
  }
  return el;
};

// Store the original playbackRate descriptor
const playbackRateDescriptor = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  "playbackRate"
);

// Set playback rate
Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
  set(value) {
    if (this.parentElement?.className.toLowerCase().includes("canvas")) {
      playbackRateDescriptor.set.call(this, 1); // Ignore Spotify's fake canvas audio
      return;
    }

    if (value.source !== "tunevo") {
      console.info("🎧 Tunevo: Prevented unintended playback rate change.");
      playbackRateDescriptor.set.call(this, currentEffect.rate);
    } else {
      playbackRateDescriptor.set.call(this, value.value);
    }
  },
  get() {
    return playbackRateDescriptor.get.call(this);
  },
});



// Enforce pitch + speed
function applyTunevo(rate = null, pitch = null) {
  // Use current effect if no parameters provided
  const targetRate = rate !== null ? rate : currentEffect.rate;
  const targetPitch = pitch !== null ? pitch : currentEffect.pitch;
  
  spotifyPlaybackEls.forEach((el) => {
    el.playbackRate = { source: "tunevo", value: targetRate };
    el.preservesPitch = targetPitch;
    console.log(`🎛️ Applied: ${targetRate}x speed, preservesPitch = ${targetPitch}`);
  });
}

// New functions for different effects
function speedUp() {
  currentEffect = { rate: 1.25, pitch: false, name: 'speedUp' };
  applyTunevo(1.25, false);
  
  // Save setting for current song
  if (currentSongId) {
    saveSongSetting(currentSongId, currentEffect);
  }
  
  console.log("🚀 Speed up effect applied");
}

function normalSpeed() {
  currentEffect = { rate: 1.0, pitch: true, name: 'normalSpeed' };
  applyTunevo(1.0, true);
  
  // Save setting for current song
  if (currentSongId) {
    saveSongSetting(currentSongId, currentEffect);
  }
  
  console.log("🎵 Normal speed restored");
}

function slowed() {
  currentEffect = { rate: 0.8, pitch: false, name: 'slowed' };
  applyTunevo(0.8, false);
  
  // Save setting for current song
  if (currentSongId) {
    saveSongSetting(currentSongId, currentEffect);
  }
  
  console.log("🐌 Slowed effect applied");
}

// Apply normal speed without saving (for when no saved setting exists)
function applyNormalSpeedWithoutSaving() {
  currentEffect = { rate: 1.0, pitch: true, name: 'normalSpeed' };
  applyTunevo(1.0, true);
  console.log("🎵 Reset to normal speed (no saved setting)");
}





// Initial delay + mutation observer
const initTunevo = () => {
  const observer = new MutationObserver(() => {
    applyTunevo();
    checkForSongChange(); // Check for song changes
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    applyTunevo(); // Reapply current effect repeatedly to fight Spotify's resets
    checkForSongChange(); // Check for song changes
  }, 1000);
};

console.log("🚀 Tunevo initializing...");
setTimeout(() => {
  initTunevo();
  applyTunevo(); // initial force
  
  // Initialize current song ID
  const songInfo = getCurrentSongInfo();
  currentSongId = getSongId(songInfo.title, songInfo.artist);
  
  // Load and apply saved setting for current song if available
  if (currentSongId && songInfo.title !== 'Not playing') {
    const savedSetting = loadSongSetting(currentSongId);
    if (savedSetting) {
      console.log(`🔄 Applying saved setting for current song "${currentSongId}":`, savedSetting);
      applyEffectByName(savedSetting.name);
    }
  }
  
  console.log("✅ Tunevo running.");
}, 2000);

// Listen for messages from content script
window.addEventListener('message', function(event) {
    if (event.data.source === 'content-script') {
        console.log('Received message from popup:', event.data.action);
        
        switch(event.data.action) {
            case 'speedUp':
                speedUp();
                break;
            case 'normalSpeed':
                normalSpeed();
                break;
            case 'slowed':
                slowed();
                break;
            case 'getCurrentSetting':
                const currentSetting = getCurrentSongSetting();
                window.postMessage({
                    source: 'injected-script',
                    action: 'currentSetting',
                    setting: currentSetting
                }, '*');
                break;
            case 'clearCurrentSetting':
                if (currentSongId) {
                    clearSongSetting(currentSongId);
                }
                window.postMessage({
                    source: 'injected-script',
                    action: 'settingCleared',
                    songId: currentSongId
                }, '*');
                break;
            case 'listAllSettings':
                const allSettings = listAllSavedSettings();
                window.postMessage({
                    source: 'injected-script',
                    action: 'allSettings',
                    settings: allSettings
                }, '*');
                break;
            default:
                console.log('Unknown action:', event.data.action);
        }
        
        // Send response back to content script for regular actions
        if (!['getCurrentSetting', 'clearCurrentSetting'].includes(event.data.action)) {
            window.postMessage({
                source: 'injected-script',
                status: 'Action executed: ' + event.data.action
            }, '*');
        }
    }
});
