// Popup script to handle button clicks and communicate with content script

document.addEventListener('DOMContentLoaded', function() {
    // Get button elements
    const speedUpBtn = document.getElementById('speedUpId');
    const normalSpeedBtn = document.getElementById('normalSpeedId');
    const slowedBtn = document.getElementById('slowedId');

    const clearSettingBtn = document.getElementById('clearSettingBtn');
    const debugBtn = document.getElementById('debugBtn');

    // Get streaming mode elements
    const streamingToggle = document.getElementById('streamingToggle');
    const rateSelector = document.getElementById('rateSelector');
    const streamingRate = document.getElementById('streamingRate');
    
    console.log('🔧 Found streaming elements:', {
        streamingToggle: !!streamingToggle,
        rateSelector: !!rateSelector,
        streamingRate: !!streamingRate
    });

    // Get song info elements
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const settingText = document.getElementById('settingText');

    // Load current song info when popup opens
    loadCurrentSong();
    
    // Load streaming mode state
    loadStreamingModeState();

    // Add event listeners
    speedUpBtn.addEventListener('click', function() {
        if (!streamingToggle.checked) {
            sendMessageToContentScript('speedUp');
            showNotification('Speed Up applied!');
            setTimeout(loadCurrentSetting, 500); // Reload setting after applying
        } else {
            showNotification('Streaming mode is active! Disable it first to use per-song settings.');
        }
    });

    normalSpeedBtn.addEventListener('click', function() {
        if (!streamingToggle.checked) {
            sendMessageToContentScript('normalSpeed');
            showNotification('Normal Speed applied!');
            setTimeout(loadCurrentSetting, 500); // Reload setting after applying
        } else {
            showNotification('Streaming mode is active! Disable it first to use per-song settings.');
        }
    });

    slowedBtn.addEventListener('click', function() {
        if (!streamingToggle.checked) {
            sendMessageToContentScript('slowed');
            showNotification('Slowed applied!');
            setTimeout(loadCurrentSetting, 500); // Reload setting after applying
        } else {
            showNotification('Streaming mode is active! Disable it first to use per-song settings.');
        }
    });

    // Streaming mode toggle
    streamingToggle.addEventListener('change', function() {
        console.log('🔧 Streaming toggle changed:', this.checked);
        const isEnabled = this.checked;
        rateSelector.style.display = isEnabled ? 'flex' : 'none';
        
        if (isEnabled) {
            const rate = streamingRate.value;
            console.log('🔧 Enabling streaming mode with rate:', rate);
            sendMessageToContentScript('enableStreamingMode', { rate: rate });
            showNotification(`Streaming mode enabled with ${rate} playback!`);
        } else {
            console.log('🔧 Disabling streaming mode');
            sendMessageToContentScript('disableStreamingMode');
            showNotification('Streaming mode disabled! Restored per-song settings.');
            setTimeout(loadCurrentSetting, 500);
        }
        
        // Save streaming mode state
        saveStreamingModeState();
    });

    // Streaming rate change
    streamingRate.addEventListener('change', function() {
        if (streamingToggle.checked) {
            const rate = streamingRate.value;
            sendMessageToContentScript('updateStreamingRate', { rate: rate });
            showNotification(`Streaming rate updated to ${rate}!`);
        }
    });

    clearSettingBtn.addEventListener('click', function() {
        if (!streamingToggle.checked) {
            sendMessageToContentScript('clearCurrentSetting');
            showNotification('Setting cleared!');
        } else {
            showNotification('Streaming mode is active! Disable it first to clear per-song settings.');
        }
    });

    debugBtn.addEventListener('click', function() {
        sendMessageToContentScript('listAllSettings');
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.source === 'content-script') {
            if (request.action === 'currentSetting') {
                updateSettingDisplay(request.data.setting);
            } else if (request.action === 'settingCleared') {
                updateSettingDisplay(null);
            } else if (request.action === 'allSettings') {
                console.log('All saved settings:', request.data.settings);
                showNotification(`Found ${Object.keys(request.data.settings).length} saved settings`);
            } else if (request.action === 'streamingModeState') {
                updateStreamingModeDisplay(request.data);
            }
        }
    });
});

function loadCurrentSong() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const activeTab = tabs[0];
        
        chrome.tabs.sendMessage(activeTab.id, {
            action: 'getCurrentSong',
            source: 'popup'
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error getting song info:', chrome.runtime.lastError);
                updateSongDisplay('Not playing');
            } else if (response && response.songInfo) {
                updateSongDisplay(response.songInfo.title);
            } else {
                updateSongDisplay('Not playing');
            }
        });
        
        // Also load current setting
        setTimeout(loadCurrentSetting, 100);
    });
}

function updateSongDisplay(title) {
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    
    songTitle.textContent = title || 'Not playing';
    songArtist.textContent = ''; // No longer showing artist
}

function sendMessageToContentScript(action, data = null) {
    console.log('🔧 sendMessageToContentScript called with:', action, data);
    // Get the active tab and send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const activeTab = tabs[0];
        
        const message = {
            action: action,
            source: 'popup'
        };
        
        if (data) {
            message.data = data;
        }
        
        console.log('🔧 Sending message to tab:', activeTab.id, message);
        chrome.tabs.sendMessage(activeTab.id, message, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
            } else {
                console.log('Message sent successfully:', response);
            }
        });
    });
}

function loadCurrentSetting() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const activeTab = tabs[0];
        
        chrome.tabs.sendMessage(activeTab.id, {
            action: 'getCurrentSetting',
            source: 'popup'
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error getting current setting:', chrome.runtime.lastError);
            }
        });
    });
}

function updateSettingDisplay(setting) {
    const settingText = document.getElementById('settingText');
    const clearSettingBtn = document.getElementById('clearSettingBtn');
    const debugBtn = document.getElementById('debugBtn');
    
    if (setting) {
        const settingNames = {
            'speedUp': 'Speed Up',
            'normalSpeed': 'Normal Speed',
            'slowed': 'Slowed'
        };
        
        settingText.textContent = `Saved: ${settingNames[setting.name] || setting.name}`;
        clearSettingBtn.style.display = 'inline-block';
        debugBtn.style.display = 'inline-block';
    } else {
        settingText.textContent = 'No saved setting';
        clearSettingBtn.style.display = 'none';
        debugBtn.style.display = 'inline-block'; // Always show debug button
    }
}

function showNotification(message) {
    // Create notification element
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
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after 2 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// Streaming mode state management
function saveStreamingModeState() {
    const streamingToggle = document.getElementById('streamingToggle');
    const streamingRate = document.getElementById('streamingRate');
    
    const state = {
        enabled: streamingToggle.checked,
        rate: streamingRate.value
    };
    
    chrome.storage.local.set({ 'tunevo_streaming_mode': state }, function() {
        console.log('Streaming mode state saved:', state);
    });
}

function loadStreamingModeState() {
    chrome.storage.local.get('tunevo_streaming_mode', function(result) {
        const state = result.tunevo_streaming_mode || { enabled: false, rate: 'normal' };
        
        const streamingToggle = document.getElementById('streamingToggle');
        const rateSelector = document.getElementById('rateSelector');
        const streamingRate = document.getElementById('streamingRate');
        
        streamingToggle.checked = state.enabled;
        streamingRate.value = state.rate;
        rateSelector.style.display = state.enabled ? 'flex' : 'none';
        
        // If streaming mode was enabled, restore it
        if (state.enabled) {
            sendMessageToContentScript('enableStreamingMode', { rate: state.rate });
        }
    });
}

function updateStreamingModeDisplay(data) {
    const streamingToggle = document.getElementById('streamingToggle');
    const rateSelector = document.getElementById('rateSelector');
    const streamingRate = document.getElementById('streamingRate');
    
    streamingToggle.checked = data.enabled;
    streamingRate.value = data.rate;
    rateSelector.style.display = data.enabled ? 'flex' : 'none';
}
