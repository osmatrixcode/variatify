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

// Streaming mode state
let streamingMode = {
  enabled: false,
  rate: 'normal'
};

// Authentication state
let isAuthenticated = false;

// Function to check authentication status
function checkAuthentication() {
  return isAuthenticated;
}

// Function to set authentication status (called from content script)
function setAuthenticationStatus(authenticated) {
  isAuthenticated = authenticated;
  console.log('🔐 Injected script authentication status:', authenticated);
  
  if (!authenticated) {
    // If not authenticated, disable all effects and reset to normal
    applyNormalSpeedWithoutSaving();
    console.log('🔐 Trial expired - all effects disabled');
  }
}

// Storage functions that communicate with content script
function getSongId(title) {
  return title.toLowerCase().trim();
}

function saveSongSetting(songId, effect) {
  window.postMessage({
    source: 'injected-script',
    action: 'saveSongSetting',
    songId: songId,
    effect: effect
  }, '*');
  
  // Set up a one-time listener for the response to log success/failure
  const responseHandler = function(event) {
    if (event.data.source === 'content-script' && event.data.action === 'saveSongSettingResponse') {
      window.removeEventListener('message', responseHandler);
      if (event.data.success) {
        console.log(`✅ Successfully saved setting for "${songId}"`);
      } else {
        console.error(`❌ Failed to save setting for "${songId}"`);
      }
    }
  };
  
  window.addEventListener('message', responseHandler);
  
  // Clean up listener after 2 seconds
  setTimeout(() => {
    window.removeEventListener('message', responseHandler);
  }, 2000);
}

function loadSongSetting(songId) {
  return new Promise((resolve) => {
    // Set up a one-time listener for the response
    const responseHandler = function(event) {
      if (event.data.source === 'content-script' && event.data.action === 'loadSongSettingResponse' && event.data.songId === songId) {
        window.removeEventListener('message', responseHandler);
        resolve(event.data.setting);
      }
    };
    
    window.addEventListener('message', responseHandler);
    
    // Send the request
    window.postMessage({
      source: 'injected-script',
      action: 'loadSongSetting',
      songId: songId
    }, '*');
    
    // Timeout after 1 second
    setTimeout(() => {
      window.removeEventListener('message', responseHandler);
      console.warn(`⚠️ Timeout loading setting for "${songId}", falling back to null`);
      resolve(null);
    }, 1000);
  });
}

function getCurrentSongInfo() {
  try {
    // Try multiple selectors to find song title on Spotify
    const selectors = [
      '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]',
      '[data-testid="context-item-info-title"]',
      '.now-playing-bar [data-testid="context-item-info-title"]',
      '.now-playing-bar .track-info__name',
      '[data-testid="track-info"] [data-testid="context-item-info-title"]',
      '.track-info__name'
    ];

    let title = 'Not playing';

    // Try to find title
    for (let selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        title = element.textContent.trim();
        break;
      }
    }

    // Fallback: try to get from page title
    if (title === 'Not playing') {
      const pageTitle = document.title;
      if (pageTitle && pageTitle.includes(' - ')) {
        const parts = pageTitle.split(' - ');
        if (parts.length >= 2) {
          title = parts[0].trim();
        }
      }
    }

    return { title };
  } catch (error) {
    console.error('Error getting song info:', error);
    return { title: 'Not playing' };
  }
}

function checkForSongChange() {
  const songInfo = getCurrentSongInfo();
  const newSongId = getSongId(songInfo.title);
  
  if (newSongId !== currentSongId && songInfo.title !== 'Not playing') {
    console.log(`🎵 Song changed from "${currentSongId}" to "${newSongId}"`);
    currentSongId = newSongId;
    
    // If streaming mode is enabled, apply streaming rate to new song
    if (streamingMode.enabled) {
      console.log(`🎵 Streaming mode active, applying ${streamingMode.rate} to new song "${newSongId}"`);
      applyStreamingRate(streamingMode.rate);
    } else if (checkAuthentication()) {
      // Only load and apply saved settings if authenticated
      loadSongSetting(newSongId).then((savedSetting) => {
        if (savedSetting) {
          console.log(`🔄 Applying saved setting for "${newSongId}":`, savedSetting);
          applyEffectByName(savedSetting.name);
        } else {
          console.log(`📝 No saved setting found for "${newSongId}", resetting to normal speed`);
          // Reset to normal speed when no saved setting (don't save this as a setting)
          applyNormalSpeedWithoutSaving();
        }
      });
    } else {
      // Not authenticated - just reset to normal speed
      console.log(`🔐 Trial expired - resetting to normal speed for "${newSongId}"`);
      applyNormalSpeedWithoutSaving();
    }
  }
  
  // Debug: Log current song info periodically (less verbose)
  if (songInfo.title !== 'Not playing' && Math.random() < 0.1) { // Only log 10% of the time
    console.log(`🎵 Currently playing: "${songInfo.title}" (ID: ${newSongId})`);
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
  if (!currentSongId) return Promise.resolve(null);
  return loadSongSetting(currentSongId);
}

function clearSongSetting(songId) {
  window.postMessage({
    source: 'injected-script',
    action: 'clearSongSetting',
    songId: songId
  }, '*');
}

function listAllSavedSettings() {
  return new Promise((resolve) => {
    // Set up a one-time listener for the response
    const responseHandler = function(event) {
      if (event.data.source === 'content-script' && event.data.action === 'listAllSettingsResponse') {
        window.removeEventListener('message', responseHandler);
        resolve(event.data.settings);
      }
    };
    
    window.addEventListener('message', responseHandler);
    
    // Send the request
    window.postMessage({
      source: 'injected-script',
      action: 'listAllSettings'
    }, '*');
    
    // Timeout after 1 second
    setTimeout(() => {
      window.removeEventListener('message', responseHandler);
      resolve({});
    }, 1000);
  });
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
  // If streaming mode is enabled, use streaming rate instead of current effect
  if (streamingMode.enabled && rate === null) {
    console.log(`🎵 Streaming mode active, using streaming rate: ${streamingMode.rate}`);
    switch(streamingMode.rate) {
      case 'slowed':
        rate = 0.8;
        pitch = false;
        break;
      case 'normal':
        rate = 1.0;
        pitch = true;
        break;
      case 'speedUp':
        rate = 1.25;
        pitch = false;
        break;
    }
  }
  
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
  if (!checkAuthentication()) {
    console.log('🔐 Trial expired - cannot apply speed up effect');
    return;
  }
  
  currentEffect = { rate: 1.25, pitch: false, name: 'speedUp' };
  applyTunevo(1.25, false);
  
  // Save setting for current song
  if (currentSongId) {
    saveSongSetting(currentSongId, currentEffect);
  }
  
  console.log("🚀 Speed up effect applied");
}

function normalSpeed() {
  if (!checkAuthentication()) {
    console.log('🔐 Trial expired - cannot apply normal speed effect');
    return;
  }
  
  currentEffect = { rate: 1.0, pitch: true, name: 'normalSpeed' };
  applyTunevo(1.0, true);
  
  // Save setting for current song
  if (currentSongId) {
    saveSongSetting(currentSongId, currentEffect);
  }
  
  console.log("🎵 Normal speed restored");
}

function slowed() {
  if (!checkAuthentication()) {
    console.log('🔐 Trial expired - cannot apply slowed effect');
    return;
  }
  
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


// Streaming mode functions
function enableStreamingMode(rate) {
  console.log('🔧 enableStreamingMode called with rate:', rate);
  streamingMode.enabled = true;
  streamingMode.rate = rate;
  
  // Update current effect to match streaming rate
  switch(rate) {
    case 'slowed':
      currentEffect = { rate: 0.8, pitch: false, name: 'streaming_slowed' };
      break;
    case 'normal':
      currentEffect = { rate: 1.0, pitch: true, name: 'streaming_normal' };
      break;
    case 'speedUp':
      currentEffect = { rate: 1.25, pitch: false, name: 'streaming_speedUp' };
      break;
  }
  
  // Apply the streaming rate to all current playback elements
  applyStreamingRate(rate);
  
  console.log(`🎵 Streaming mode enabled with ${rate} playback, currentEffect updated:`, currentEffect);
}

function disableStreamingMode() {
  console.log('🔧 disableStreamingMode called');
  streamingMode.enabled = false;
  
  // Restore per-song settings if available
  if (currentSongId) {
    loadSongSetting(currentSongId).then((savedSetting) => {
      if (savedSetting) {
        console.log(`🔄 Restoring saved setting for "${currentSongId}":`, savedSetting);
        applyEffectByName(savedSetting.name);
      } else {
        console.log(`📝 No saved setting found for "${currentSongId}", resetting to normal speed`);
        applyNormalSpeedWithoutSaving();
      }
    });
  } else {
    console.log(`📝 No current song ID, resetting to normal speed`);
    applyNormalSpeedWithoutSaving();
  }
  
  console.log("🎵 Streaming mode disabled, restored per-song settings");
}

function updateStreamingRate(rate) {
  if (streamingMode.enabled) {
    console.log('🔧 updateStreamingRate called with rate:', rate);
    streamingMode.rate = rate;
    
    // Update current effect to match new streaming rate
    switch(rate) {
      case 'slowed':
        currentEffect = { rate: 0.8, pitch: false, name: 'streaming_slowed' };
        break;
      case 'normal':
        currentEffect = { rate: 1.0, pitch: true, name: 'streaming_normal' };
        break;
      case 'speedUp':
        currentEffect = { rate: 1.25, pitch: false, name: 'streaming_speedUp' };
        break;
    }
    
    applyStreamingRate(rate);
    console.log(`🎵 Streaming rate updated to ${rate}, currentEffect updated:`, currentEffect);
  }
}

function applyStreamingRate(rate) {
  console.log('🔧 applyStreamingRate called with rate:', rate);
  switch(rate) {
    case 'slowed':
      console.log('🔧 Applying slowed rate: 0.8x');
      applyTunevo(0.8, false);
      break;
    case 'normal':
      console.log('🔧 Applying normal rate: 1.0x');
      applyTunevo(1.0, true);
      break;
    case 'speedUp':
      console.log('🔧 Applying speed up rate: 1.25x');
      applyTunevo(1.25, false);
      break;
    default:
      console.log('Unknown streaming rate:', rate);
      applyTunevo(1.0, true);
  }
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
  currentSongId = getSongId(songInfo.title);
  
  // Load and apply saved setting for current song if available
  if (currentSongId && songInfo.title !== 'Not playing') {
    loadSongSetting(currentSongId).then((savedSetting) => {
      if (savedSetting) {
        console.log(`🔄 Applying saved setting for current song "${currentSongId}":`, savedSetting);
        applyEffectByName(savedSetting.name);
      }
    });
  }
  
  console.log("✅ Tunevo running.");
}, 2000);

// Listen for messages from content script
window.addEventListener('message', function(event) {
    if (event.data.source === 'content-script') {
        console.log('Received message from popup:', event.data.action, event.data);
        
        switch(event.data.action) {
            case 'setAuthenticationStatus':
                setAuthenticationStatus(event.data.authenticated);
                break;
            case 'speedUp':
                if (!streamingMode.enabled) {
                    speedUp();
                }
                break;
            case 'normalSpeed':
                if (!streamingMode.enabled) {
                    normalSpeed();
                }
                break;
            case 'slowed':
                if (!streamingMode.enabled) {
                    slowed();
                }
                break;
            case 'enableStreamingMode':
                console.log('🔧 Processing enableStreamingMode message:', event.data);
                enableStreamingMode(event.data.data.rate);
                break;
            case 'disableStreamingMode':
                disableStreamingMode();
                break;
            case 'updateStreamingRate':
                updateStreamingRate(event.data.data.rate);
                break;
            case 'getCurrentSetting':
                console.log('🔧 getCurrentSetting called, streamingMode.enabled:', streamingMode.enabled);
                if (streamingMode.enabled) {
                    // Send streaming mode state instead of per-song setting
                    const streamingSetting = { name: 'streaming', rate: streamingMode.rate };
                    console.log('🔧 Sending streaming mode setting:', streamingSetting);
                    window.postMessage({
                        source: 'injected-script',
                        action: 'currentSetting',
                        setting: streamingSetting
                    }, '*');
                } else {
                    getCurrentSongSetting().then((currentSetting) => {
                        console.log('🔧 Sending per-song setting:', currentSetting);
                        window.postMessage({
                            source: 'injected-script',
                            action: 'currentSetting',
                            setting: currentSetting
                        }, '*');
                    });
                }
                break;
            case 'clearCurrentSetting':
                if (!streamingMode.enabled && currentSongId) {
                    clearSongSetting(currentSongId);
                }
                // Apply normal speed when clearing a saved setting
                applyNormalSpeedWithoutSaving();
                window.postMessage({
                    source: 'injected-script',
                    action: 'settingCleared',
                    songId: currentSongId
                }, '*');
                break;
            case 'listAllSettings':
                listAllSavedSettings().then((allSettings) => {
                    window.postMessage({
                        source: 'injected-script',
                        action: 'allSettings',
                        settings: allSettings
                    }, '*');
                });
                break;
            default:
                console.log('Unknown action:', event.data.action);
        }
        
        // Send response back to content script for regular actions
        if (!['getCurrentSetting', 'clearCurrentSetting', 'enableStreamingMode', 'disableStreamingMode', 'updateStreamingRate', 'setAuthenticationStatus'].includes(event.data.action)) {
            window.postMessage({
                source: 'injected-script',
                status: 'Action executed: ' + event.data.action
            }, '*');
        }
    }
});
