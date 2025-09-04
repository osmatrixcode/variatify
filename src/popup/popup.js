// Popup script to handle button clicks and communicate with content script

document.addEventListener('DOMContentLoaded', function() {
    // Get button elements
    const speedUpBtn = document.getElementById('speedUpId');
    const normalSpeedBtn = document.getElementById('normalSpeedId');
    const slowedBtn = document.getElementById('slowedId');

    const clearSettingBtn = document.getElementById('clearSettingBtn');

    // Get streaming mode elements
    const streamingToggle = document.getElementById('streamingToggle');
    const rateSelector = document.getElementById('rateSelector');
    const streamingRate = document.getElementById('streamingRate');
    
    // Flag to track if injected script is ready
    let injectedScriptReady = false;
    
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
    
    // Load streaming mode state with a delay to ensure injected script is ready
    // First try to get current setting to see if injected script is ready
    setTimeout(() => {
        console.log('🔧 Checking if injected script is ready...');
        sendMessageToContentScript('getCurrentSetting');
        
        // Wait a bit more for the response, then load streaming mode state
        // Also add a timeout to prevent infinite waiting
        setTimeout(() => {
            if (!injectedScriptReady) {
                console.log('🔧 Injected script not ready after timeout, proceeding anyway...');
                injectedScriptReady = true;
            }
            loadStreamingModeState();
            
            // Add a periodic check to ensure streaming rate is correct
            setTimeout(() => {
                if (injectedScriptReady) {
                    console.log('🔧 Periodic check: verifying streaming rate is correct...');
                    sendMessageToContentScript('getCurrentSetting');
                }
            }, 2000);
        }, 1000);
    }, 300);

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
            setTimeout(loadCurrentSetting, 500); // Refresh setting display
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
            setTimeout(loadCurrentSetting, 500); // Refresh setting display
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



    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.source === 'content-script') {
            if (request.action === 'currentSetting') {
                console.log('🔧 Received currentSetting message:', request.data.setting);
                injectedScriptReady = true; // Mark injected script as ready
                updateSettingDisplay(request.data.setting);
                
                // If this is a streaming mode setting, update the streaming UI accordingly
                if (request.data.setting && request.data.setting.name === 'streaming') {
                    console.log('🔧 Updating streaming UI for streaming mode setting');
                    const streamingToggle = document.getElementById('streamingToggle');
                    const rateSelector = document.getElementById('rateSelector');
                    const streamingRate = document.getElementById('streamingRate');
                    
                    // Update UI to reflect current streaming state
                    streamingToggle.checked = true;
                    streamingRate.value = request.data.setting.rate;
                    rateSelector.style.display = 'flex';
                    
                    console.log('🔧 Updated streaming UI:', {
                        toggleChecked: streamingToggle.checked,
                        rateValue: streamingRate.value,
                        rateSelectorDisplay: rateSelector.style.display
                    });
                    
                    // Save the current streaming state to storage
                    saveStreamingModeState();
                    
                    // Verify the streaming rate is correctly set
                    console.log('🔧 Verifying streaming rate after update:', {
                        expectedRate: request.data.setting.rate,
                        actualRate: streamingRate.value,
                        options: Array.from(streamingRate.options).map(opt => ({ value: opt.value, selected: opt.selected }))
                    });
                }
            } else if (request.action === 'settingCleared') {
                updateSettingDisplay(null);
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
    
    if (setting) {
        // Handle streaming mode setting differently
        if (setting.name === 'streaming') {
            const rateNames = {
                'speedUp': 'Speed Up',
                'normalSpeed': 'Normal Speed',
                'slowed': 'Slowed'
            };
            settingText.textContent = `Streaming playback rate: ${rateNames[setting.rate] || setting.rate}`;
            clearSettingBtn.style.display = 'none'; // Hide clear button for streaming mode
        } else {
            const settingNames = {
                'speedUp': 'Speed Up',
                'normalSpeed': 'Normal Speed',
                'slowed': 'Slowed'
            };
            
            settingText.textContent = `Saved: ${settingNames[setting.name] || setting.name}`;
            clearSettingBtn.style.display = 'inline-block';
        }
    } else {
        settingText.textContent = 'No saved setting';
        clearSettingBtn.style.display = 'none';
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
    console.log('🔧 loadStreamingModeState called');
    chrome.storage.local.get('tunevo_streaming_mode', function(result) {
        const state = result.tunevo_streaming_mode || { enabled: false, rate: 'normal' };
        console.log('🔧 Loaded streaming mode state from storage:', state);
        
        const streamingToggle = document.getElementById('streamingToggle');
        const rateSelector = document.getElementById('rateSelector');
        const streamingRate = document.getElementById('streamingRate');
        
        streamingToggle.checked = state.enabled;
        
        // Explicitly set the streaming rate value to ensure it's not defaulting to first option
        streamingRate.value = state.rate;
        
        // Double-check that the value was set correctly
        if (streamingRate.value !== state.rate) {
            console.log('🔧 Warning: streamingRate.value was not set correctly, forcing it...');
            // Force set the value by finding the option and selecting it
            for (let option of streamingRate.options) {
                if (option.value === state.rate) {
                    option.selected = true;
                    break;
                }
            }
        }
        
        rateSelector.style.display = state.enabled ? 'flex' : 'none';
        
        console.log('🔧 Updated UI elements:', {
            toggleChecked: streamingToggle.checked,
            rateValue: streamingRate.value,
            rateSelectorDisplay: rateSelector.style.display
        });
        
        // If streaming mode was enabled, restore it and also get current state from injected script
        if (state.enabled) {
            console.log('🔧 Streaming mode was enabled, restoring...');
            
            // Wait for injected script to be ready before proceeding
            if (!injectedScriptReady) {
                console.log('🔧 Injected script not ready yet, waiting...');
                setTimeout(() => loadStreamingModeState(), 100);
                return;
            }
            
            // First, get the current streaming state from the injected script to ensure sync
            console.log('🔧 Sending getCurrentSetting message...');
            sendMessageToContentScript('getCurrentSetting');
            
            // Wait a bit before enabling streaming mode to allow getCurrentSetting to complete
            setTimeout(() => {
                console.log('🔧 Sending enableStreamingMode message...');
                sendMessageToContentScript('enableStreamingMode', { rate: state.rate });
            }, 100);
        } else {
            console.log('🔧 Streaming mode was not enabled');
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
