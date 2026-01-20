// Variatify Main Script
// Entry point for the injected script - coordinates audio manipulation and song detection

// Global state (accessible to other modules via window.variatifyState)
window.variatifyState = {
  currentEffect: { ...VARIATIFY.EFFECTS.NORMAL },
  currentSongId: null,
  streamingMode: { enabled: false, rate: 'normal' }
};

// Storage communication functions
function saveSongSetting(songId, effect) {
  window.postMessage({
    source: VARIATIFY.SOURCE.INJECTED,
    action: 'saveSongSetting',
    songId: songId,
    effect: effect
  }, '*');
}

function loadSongSetting(songId) {
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data.source === VARIATIFY.SOURCE.CONTENT &&
          event.data.action === 'loadSongSettingResponse' &&
          event.data.songId === songId) {
        window.removeEventListener('message', handler);
        resolve(event.data.setting);
      }
    };

    window.addEventListener('message', handler);
    window.postMessage({
      source: VARIATIFY.SOURCE.INJECTED,
      action: 'loadSongSetting',
      songId: songId
    }, '*');

    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, VARIATIFY.TIMEOUTS.MESSAGE_TIMEOUT);
  });
}

function clearSongSetting(songId) {
  window.postMessage({
    source: VARIATIFY.SOURCE.INJECTED,
    action: 'clearSongSetting',
    songId: songId
  }, '*');
}

function listAllSavedSettings() {
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data.source === VARIATIFY.SOURCE.CONTENT &&
          event.data.action === 'listAllSettingsResponse') {
        window.removeEventListener('message', handler);
        resolve(event.data.settings);
      }
    };

    window.addEventListener('message', handler);
    window.postMessage({
      source: VARIATIFY.SOURCE.INJECTED,
      action: 'listAllSettings'
    }, '*');

    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({});
    }, VARIATIFY.TIMEOUTS.MESSAGE_TIMEOUT);
  });
}

// Effect application functions
function applyCurrentEffect() {
  const state = window.variatifyState;

  if (state.streamingMode.enabled) {
    const { rate, pitch } = getStreamingRateValues(state.streamingMode.rate);
    applyEffect(rate, pitch);
  } else {
    applyEffect(state.currentEffect.rate, state.currentEffect.pitch);
  }
}

function speedUp() {
  const state = window.variatifyState;
  state.currentEffect = { ...VARIATIFY.EFFECTS.SPEED_UP };
  applyEffect(state.currentEffect.rate, state.currentEffect.pitch);

  if (state.currentSongId) {
    saveSongSetting(state.currentSongId, state.currentEffect);
  }
}

function normalSpeed() {
  const state = window.variatifyState;
  state.currentEffect = { ...VARIATIFY.EFFECTS.NORMAL };
  applyEffect(state.currentEffect.rate, state.currentEffect.pitch);

  if (state.currentSongId) {
    saveSongSetting(state.currentSongId, state.currentEffect);
  }
}

function slowed() {
  const state = window.variatifyState;
  state.currentEffect = { ...VARIATIFY.EFFECTS.SLOWED };
  applyEffect(state.currentEffect.rate, state.currentEffect.pitch);

  if (state.currentSongId) {
    saveSongSetting(state.currentSongId, state.currentEffect);
  }
}

function applyNormalSpeedWithoutSaving() {
  const state = window.variatifyState;
  state.currentEffect = { ...VARIATIFY.EFFECTS.NORMAL };
  applyEffect(state.currentEffect.rate, state.currentEffect.pitch);
}

function applyEffectByName(effectName) {
  switch (effectName) {
    case 'speedUp':
      speedUp();
      break;
    case 'normalSpeed':
      normalSpeed();
      break;
    case 'slowed':
      slowed();
      break;
  }
}

// Streaming mode functions
function enableStreamingMode(rate) {
  const state = window.variatifyState;
  state.streamingMode.enabled = true;
  state.streamingMode.rate = rate;

  const { rate: rateValue, pitch } = getStreamingRateValues(rate);
  state.currentEffect = { rate: rateValue, pitch, name: `streaming_${rate}` };
  applyEffect(rateValue, pitch);
}

function disableStreamingMode() {
  const state = window.variatifyState;
  state.streamingMode.enabled = false;

  // Restore per-song settings if available
  if (state.currentSongId) {
    loadSongSetting(state.currentSongId).then((savedSetting) => {
      if (savedSetting) {
        applyEffectByName(savedSetting.name);
      } else {
        applyNormalSpeedWithoutSaving();
      }
    });
  } else {
    applyNormalSpeedWithoutSaving();
  }
}

function updateStreamingRate(rate) {
  const state = window.variatifyState;
  if (state.streamingMode.enabled) {
    state.streamingMode.rate = rate;
    const { rate: rateValue, pitch } = getStreamingRateValues(rate);
    state.currentEffect = { rate: rateValue, pitch, name: `streaming_${rate}` };
    applyEffect(rateValue, pitch);
  }
}

// Song change detection
function checkForSongChange() {
  const state = window.variatifyState;
  const songInfo = getCurrentSongInfo();
  const newSongId = getSongId(songInfo.title);

  if (newSongId !== state.currentSongId && songInfo.title !== 'Not playing') {
    state.currentSongId = newSongId;

    // Notify content script about song change
    window.postMessage({
      source: VARIATIFY.SOURCE.INJECTED,
      action: 'songChanged',
      songInfo: songInfo
    }, '*');

    // Apply appropriate settings for new song
    if (state.streamingMode.enabled) {
      const { rate, pitch } = getStreamingRateValues(state.streamingMode.rate);
      applyEffect(rate, pitch);
    } else {
      loadSongSetting(newSongId).then((savedSetting) => {
        if (savedSetting) {
          applyEffectByName(savedSetting.name);
        } else {
          applyNormalSpeedWithoutSaving();
        }
      });
    }
  }
}

// Message handler
function handleMessage(event) {
  if (event.data.source !== VARIATIFY.SOURCE.CONTENT) return;

  const state = window.variatifyState;

  switch (event.data.action) {
    case 'speedUp':
      if (!state.streamingMode.enabled) speedUp();
      break;

    case 'normalSpeed':
      if (!state.streamingMode.enabled) normalSpeed();
      break;

    case 'slowed':
      if (!state.streamingMode.enabled) slowed();
      break;

    case 'enableStreamingMode':
      enableStreamingMode(event.data.data.rate);
      break;

    case 'disableStreamingMode':
      disableStreamingMode();
      break;

    case 'updateStreamingRate':
      updateStreamingRate(event.data.data.rate);
      break;

    case 'getCurrentSetting':
      if (state.streamingMode.enabled) {
        window.postMessage({
          source: VARIATIFY.SOURCE.INJECTED,
          action: 'currentSetting',
          setting: { name: 'streaming', rate: state.streamingMode.rate }
        }, '*');
      } else {
        loadSongSetting(state.currentSongId).then((setting) => {
          window.postMessage({
            source: VARIATIFY.SOURCE.INJECTED,
            action: 'currentSetting',
            setting: setting
          }, '*');
        });
      }
      break;

    case 'clearCurrentSetting':
      if (!state.streamingMode.enabled && state.currentSongId) {
        clearSongSetting(state.currentSongId);
      }
      applyNormalSpeedWithoutSaving();
      window.postMessage({
        source: VARIATIFY.SOURCE.INJECTED,
        action: 'settingCleared',
        songId: state.currentSongId
      }, '*');
      break;

    case 'listAllSettings':
      listAllSavedSettings().then((allSettings) => {
        window.postMessage({
          source: VARIATIFY.SOURCE.INJECTED,
          action: 'allSettings',
          settings: allSettings
        }, '*');
      });
      break;
  }

  // Send acknowledgment for basic actions
  const noAckActions = ['getCurrentSetting', 'clearCurrentSetting', 'enableStreamingMode',
                        'disableStreamingMode', 'updateStreamingRate', 'listAllSettings'];
  if (!noAckActions.includes(event.data.action)) {
    window.postMessage({
      source: VARIATIFY.SOURCE.INJECTED,
      status: 'Action executed: ' + event.data.action
    }, '*');
  }
}

// Initialization
function init() {
  const state = window.variatifyState;

  // Set up mutation observer to reapply effect when Spotify changes audio
  const observer = new MutationObserver(() => {
    applyCurrentEffect();
    checkForSongChange();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Poll to fight Spotify's rate resets and detect song changes
  setInterval(() => {
    applyCurrentEffect();
    checkForSongChange();
  }, VARIATIFY.TIMEOUTS.POLL_INTERVAL);

  // Initialize current song
  const songInfo = getCurrentSongInfo();
  state.currentSongId = getSongId(songInfo.title);

  // Load saved setting for current song
  if (state.currentSongId && songInfo.title !== 'Not playing') {
    loadSongSetting(state.currentSongId).then((savedSetting) => {
      if (savedSetting) {
        applyEffectByName(savedSetting.name);
      }
    });
  }

  console.log('Variatify initialized');
}

// Set up message listener
window.addEventListener('message', handleMessage);

// Start after a delay to ensure Spotify is fully loaded
setTimeout(() => {
  init();
  applyCurrentEffect();
}, VARIATIFY.TIMEOUTS.INIT_DELAY);
