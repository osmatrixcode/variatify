// Variatify Popup Script
// Handles UI interactions and communicates with content script

// Constants
const STORAGE_KEYS = {
  SONG_SETTINGS: 'variatify_song_settings',
  STREAMING_MODE: 'variatify_streaming_mode',
  LEGACY_SONG_SETTINGS: 'tunevo_song_settings',
  LEGACY_STREAMING_MODE: 'tunevo_streaming_mode'
};

const TIMEOUTS = {
  INIT_CHECK: 300,
  READY_CHECK: 1000,
  SETTING_RELOAD: 500,
  PERIODIC_CHECK: 2000
};

const EFFECT_NAMES = {
  speedUp: 'Speed Up',
  normalSpeed: 'Normal Speed',
  slowed: 'Slowed'
};

// State
let injectedScriptReady = false;

document.addEventListener('DOMContentLoaded', function() {
  // Get UI elements
  const speedUpBtn = document.getElementById('speedUpId');
  const normalSpeedBtn = document.getElementById('normalSpeedId');
  const slowedBtn = document.getElementById('slowedId');
  const clearSettingBtn = document.getElementById('clearSettingBtn');
  const streamingToggle = document.getElementById('streamingToggle');
  const rateSelector = document.getElementById('rateSelector');
  const streamingRate = document.getElementById('streamingRate');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');

  // Initialize
  loadCurrentSong();

  // Check if injected script is ready
  setTimeout(() => {
    sendMessageToContentScript('getCurrentSetting');
    setTimeout(() => {
      if (!injectedScriptReady) {
        injectedScriptReady = true;
      }
      loadStreamingModeState();
    }, TIMEOUTS.READY_CHECK);
  }, TIMEOUTS.INIT_CHECK);

  // Effect button handlers
  speedUpBtn.addEventListener('click', function() {
    if (!streamingToggle.checked) {
      sendMessageToContentScript('speedUp');
      showNotification('Speed Up applied!');
      setTimeout(loadCurrentSetting, TIMEOUTS.SETTING_RELOAD);
    } else {
      showNotification('Disable streaming mode first to use per-song settings.');
    }
  });

  normalSpeedBtn.addEventListener('click', function() {
    if (!streamingToggle.checked) {
      sendMessageToContentScript('normalSpeed');
      showNotification('Normal Speed applied!');
      setTimeout(loadCurrentSetting, TIMEOUTS.SETTING_RELOAD);
    } else {
      showNotification('Disable streaming mode first to use per-song settings.');
    }
  });

  slowedBtn.addEventListener('click', function() {
    if (!streamingToggle.checked) {
      sendMessageToContentScript('slowed');
      showNotification('Slowed applied!');
      setTimeout(loadCurrentSetting, TIMEOUTS.SETTING_RELOAD);
    } else {
      showNotification('Disable streaming mode first to use per-song settings.');
    }
  });

  // Streaming mode handlers
  streamingToggle.addEventListener('change', function() {
    const isEnabled = this.checked;
    rateSelector.style.display = isEnabled ? 'flex' : 'none';
    updateControlButtonsState(isEnabled);

    if (isEnabled) {
      const rate = streamingRate.value;
      sendMessageToContentScript('enableStreamingMode', { rate });
      showNotification(`Streaming mode enabled: ${rate}`);
    } else {
      sendMessageToContentScript('disableStreamingMode');
      showNotification('Streaming mode disabled');
    }

    setTimeout(loadCurrentSetting, TIMEOUTS.SETTING_RELOAD);
    saveStreamingModeState();
  });

  streamingRate.addEventListener('change', function() {
    if (streamingToggle.checked) {
      const rate = streamingRate.value;
      sendMessageToContentScript('updateStreamingRate', { rate });
      showNotification(`Streaming rate: ${rate}`);
      setTimeout(loadCurrentSetting, TIMEOUTS.SETTING_RELOAD);
      saveStreamingModeState();
    }
  });

  // Clear button handlers
  clearSettingBtn.addEventListener('click', function() {
    if (!streamingToggle.checked) {
      sendMessageToContentScript('clearCurrentSetting');
      showNotification('Setting cleared!');
    } else {
      showNotification('Disable streaming mode first to clear settings.');
    }
  });

  clearAllBtn.addEventListener('click', function() {
    if (confirm('Clear ALL preferences? This cannot be undone.')) {
      clearAllPreferences();
    }
  });

  // Import/Export handlers
  exportBtn.addEventListener('click', exportPreferences);

  importBtn.addEventListener('click', function() {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      importPreferences(file);
    }
  });

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function(request) {
    if (request.source !== 'content-script') return;

    switch (request.action) {
      case 'songChanged':
        updateSongDisplay(request.songInfo.title);
        setTimeout(loadCurrentSetting, 100);
        break;

      case 'currentSetting':
        injectedScriptReady = true;
        updateSettingDisplay(request.data.setting);

        // Sync streaming UI if in streaming mode
        if (request.data.setting?.name === 'streaming') {
          streamingToggle.checked = true;
          streamingRate.value = request.data.setting.rate;
          rateSelector.style.display = 'flex';
          saveStreamingModeState();
        }
        break;

      case 'settingCleared':
        updateSettingDisplay(null);
        break;
    }
  });
});

// Helper functions
function loadCurrentSong() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'getCurrentSong',
      source: 'popup'
    }, function(response) {
      if (chrome.runtime.lastError) {
        updateSongDisplay('Not playing');
      } else if (response?.songInfo) {
        updateSongDisplay(response.songInfo.title);
      } else {
        updateSongDisplay('Not playing');
      }
    });

    setTimeout(loadCurrentSetting, 100);
  });
}

function updateSongDisplay(title) {
  const songTitle = document.getElementById('songTitle');
  songTitle.textContent = title || 'Not playing';
}

function sendMessageToContentScript(action, data = null) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const message = { action, source: 'popup' };
    if (data) message.data = data;

    chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Variatify: Message error:', chrome.runtime.lastError);
      }
    });
  });
}

function loadCurrentSetting() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'getCurrentSetting',
      source: 'popup'
    }, function() {
      // Response handled by onMessage listener
    });
  });
}

function updateSettingDisplay(setting) {
  const settingText = document.getElementById('settingText');
  const clearSettingBtn = document.getElementById('clearSettingBtn');

  if (setting) {
    if (setting.name === 'streaming') {
      settingText.textContent = `Streaming: ${EFFECT_NAMES[setting.rate] || setting.rate}`;
      clearSettingBtn.style.display = 'none';
    } else {
      settingText.textContent = `Saved: ${EFFECT_NAMES[setting.name] || setting.name}`;
      clearSettingBtn.style.display = 'inline-block';
    }
  } else {
    settingText.textContent = 'No saved setting';
    clearSettingBtn.style.display = 'none';
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #50b83c;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Streaming mode state
function saveStreamingModeState() {
  const streamingToggle = document.getElementById('streamingToggle');
  const streamingRate = document.getElementById('streamingRate');

  chrome.storage.local.set({
    [STORAGE_KEYS.STREAMING_MODE]: {
      enabled: streamingToggle.checked,
      rate: streamingRate.value
    }
  });
}

function loadStreamingModeState() {
  chrome.storage.local.get(STORAGE_KEYS.STREAMING_MODE, function(result) {
    const state = result[STORAGE_KEYS.STREAMING_MODE] || { enabled: false, rate: 'normal' };

    const streamingToggle = document.getElementById('streamingToggle');
    const rateSelector = document.getElementById('rateSelector');
    const streamingRate = document.getElementById('streamingRate');

    streamingToggle.checked = state.enabled;
    streamingRate.value = state.rate;
    rateSelector.style.display = state.enabled ? 'flex' : 'none';
    updateControlButtonsState(state.enabled);

    if (state.enabled) {
      sendMessageToContentScript('getCurrentSetting');
      setTimeout(() => {
        sendMessageToContentScript('enableStreamingMode', { rate: state.rate });
      }, 100);
    }
  });
}

function updateControlButtonsState(streamingModeEnabled) {
  document.getElementById('speedUpId').disabled = streamingModeEnabled;
  document.getElementById('normalSpeedId').disabled = streamingModeEnabled;
  document.getElementById('slowedId').disabled = streamingModeEnabled;
}

// Preferences management
function clearAllPreferences() {
  chrome.storage.local.clear(function() {
    if (chrome.runtime.lastError) {
      showNotification('Error clearing preferences!');
    } else {
      showNotification('All preferences cleared!');
      resetUIToDefault();
      refreshCurrentTab();
      window.close();
    }
  });
}

function resetUIToDefault() {
  const streamingToggle = document.getElementById('streamingToggle');
  const rateSelector = document.getElementById('rateSelector');
  const streamingRate = document.getElementById('streamingRate');

  streamingToggle.checked = false;
  rateSelector.style.display = 'none';
  streamingRate.value = 'normal';
  updateControlButtonsState(false);
  updateSettingDisplay(null);
  updateSongDisplay('Loading...');
}

function refreshCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
    }
  });
}

function exportPreferences() {
  chrome.storage.local.get([STORAGE_KEYS.SONG_SETTINGS, STORAGE_KEYS.STREAMING_MODE], function(result) {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      songSettings: result[STORAGE_KEYS.SONG_SETTINGS] || {},
      streamingMode: result[STORAGE_KEYS.STREAMING_MODE] || { enabled: false, rate: 'normal' }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `variatify-preferences-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    const songCount = Object.keys(exportData.songSettings).length;
    showNotification(`Exported ${songCount} song preferences!`);
  });
}

function importPreferences(file) {
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const importData = JSON.parse(e.target.result);

      if (!importData.version || !importData.songSettings || !importData.streamingMode) {
        throw new Error('Invalid file format');
      }

      const songCount = Object.keys(importData.songSettings).length;

      if (confirm(`Import ${songCount} song preferences? This will replace current preferences.`)) {
        chrome.storage.local.set({
          [STORAGE_KEYS.SONG_SETTINGS]: importData.songSettings,
          [STORAGE_KEYS.STREAMING_MODE]: importData.streamingMode
        }, function() {
          if (chrome.runtime.lastError) {
            showNotification('Error importing preferences!');
          } else {
            showNotification(`Imported ${songCount} song preferences!`);
            loadStreamingModeState();
            loadCurrentSetting();
            refreshCurrentTab();
          }
        });
      }
    } catch (error) {
      showNotification('Invalid file format');
    }
  };

  reader.onerror = function() {
    showNotification('Error reading file');
  };

  reader.readAsText(file);
}
