// Popup script to handle button clicks and communicate with content script

// Initialize ExtPay
const extpay = ExtPay("tunevo-test");

// Trial duration in milliseconds (7 days)
const TRIAL_DURATION = 7 * 24 * 60 * 60 * 1000;

// Check if trial is active
function isTrialActive(user) {
  if (!user.trialStartedAt) return false;
  const now = new Date();
  const trialEnd = new Date(user.trialStartedAt.getTime() + TRIAL_DURATION);
  return now < trialEnd;
}

// Get trial days remaining
function getTrialDaysRemaining(user) {
  if (!user.trialStartedAt) return 0;
  const now = new Date();
  const trialEnd = new Date(user.trialStartedAt.getTime() + TRIAL_DURATION);
  const diff = trialEnd - now;
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

// Update payment UI based on user status
function updatePaymentUI(user) {
  const paymentText = document.getElementById('paymentText');
  const trialBtn = document.getElementById('trialBtn');
  const loginBtn = document.getElementById('loginBtn');
  const payBtn = document.getElementById('payBtn');
  const manageBtn = document.getElementById('manageBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user.paid) {
    paymentText.innerHTML = "🎉 Premium Lifetime Access!";
    trialBtn.style.display = "none";
    loginBtn.style.display = "none";
    payBtn.style.display = "none";
    manageBtn.style.display = "inline-block";
    logoutBtn.style.display = "inline-block";
    enableExtensionFeatures();
  } else if (isTrialActive(user)) {
    const daysRemaining = getTrialDaysRemaining(user);
    paymentText.innerHTML = `⏰ Free Trial: ${daysRemaining} days left`;
    trialBtn.style.display = "none";
    loginBtn.style.display = "none";
    payBtn.style.display = "inline-block";
    manageBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    enableExtensionFeatures();
  } else if (user.trialStartedAt) {
    paymentText.innerHTML = "💳 Trial Expired - Upgrade Now!";
    trialBtn.style.display = "none";
    loginBtn.style.display = "none";
    payBtn.style.display = "inline-block";
    manageBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    disableExtensionFeatures();
  } else {
    paymentText.innerHTML = "🔒 Sign up required to use Tunevo";
    trialBtn.style.display = "inline-block";
    loginBtn.style.display = "inline-block";
    payBtn.style.display = "none";
    manageBtn.style.display = "none";
    logoutBtn.style.display = "none";
    disableExtensionFeatures();
  }
}

// Enable extension features
function enableExtensionFeatures() {
  const controls = document.querySelector('.controls');
  const streamingMode = document.querySelector('.streaming-mode');
  const clearAllSection = document.querySelector('.clear-all-section');
  const importExportSection = document.querySelector('.import-export-section');
  
  if (controls) controls.style.opacity = '1';
  if (streamingMode) streamingMode.style.opacity = '1';
  if (clearAllSection) clearAllSection.style.opacity = '1';
  if (importExportSection) importExportSection.style.opacity = '1';
  
  // Enable all buttons
  const buttons = document.querySelectorAll('.control-btn, .clear-btn, .clear-all-btn, .import-export-btn');
  buttons.forEach(btn => {
    btn.disabled = false;
    btn.style.cursor = 'pointer';
  });
  
  // Enable streaming toggle
  const streamingToggle = document.getElementById('streamingToggle');
  if (streamingToggle) {
    streamingToggle.disabled = false;
    streamingToggle.style.cursor = 'pointer';
  }
}

// Disable extension features
function disableExtensionFeatures() {
  const controls = document.querySelector('.controls');
  const streamingMode = document.querySelector('.streaming-mode');
  const clearAllSection = document.querySelector('.clear-all-section');
  const importExportSection = document.querySelector('.import-export-section');
  
  if (controls) controls.style.opacity = '0.5';
  if (streamingMode) streamingMode.style.opacity = '0.5';
  if (clearAllSection) clearAllSection.style.opacity = '0.5';
  if (importExportSection) importExportSection.style.opacity = '0.5';
  
  // Disable all buttons
  const buttons = document.querySelectorAll('.control-btn, .clear-btn, .clear-all-btn, .import-export-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.cursor = 'not-allowed';
  });
  
  // Disable streaming toggle
  const streamingToggle = document.getElementById('streamingToggle');
  if (streamingToggle) {
    streamingToggle.disabled = true;
    streamingToggle.style.cursor = 'not-allowed';
  }
}

// Check if user is authenticated (has trial or paid)
function checkAuthentication() {
  // This will be set by the ExtPay user status
  console.log('🔐 Checking authentication:', window.userAuthenticated);
  return window.userAuthenticated || false;
}

// Show authentication required message
function showAuthRequiredMessage() {
  showNotification('🔒 Please sign up for free trial to use Tunevo!');
}

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
        if (!checkAuthentication()) return;
        if (!streamingToggle.checked) {
            sendMessageToContentScript('speedUp');
            showNotification('Speed Up applied!');
            setTimeout(loadCurrentSetting, 500); // Reload setting after applying
        } else {
            showNotification('Streaming mode is active! Disable it first to use per-song settings.');
        }
    });

    normalSpeedBtn.addEventListener('click', function() {
        if (!checkAuthentication()) return;
        if (!streamingToggle.checked) {
            sendMessageToContentScript('normalSpeed');
            showNotification('Normal Speed applied!');
            setTimeout(loadCurrentSetting, 500); // Reload setting after applying
        } else {
            showNotification('Streaming mode is active! Disable it first to use per-song settings.');
        }
    });

    slowedBtn.addEventListener('click', function() {
        if (!checkAuthentication()) return;
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
        if (!checkAuthentication()) {
            this.checked = false; // Reset toggle
            showAuthRequiredMessage();
            return;
        }
        console.log('🔧 Streaming toggle changed:', this.checked);
        const isEnabled = this.checked;
        rateSelector.style.display = isEnabled ? 'flex' : 'none';
        
        // Enable/disable control buttons based on streaming mode
        updateControlButtonsState(isEnabled);
        
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
        if (!checkAuthentication()) {
            showAuthRequiredMessage();
            return;
        }
        if (!streamingToggle.checked) {
            sendMessageToContentScript('clearCurrentSetting');
            showNotification('Setting cleared!');
        } else {
            showNotification('Streaming mode is active! Disable it first to clear per-song settings.');
        }
    });

    // Clear all preferences button
    const clearAllBtn = document.getElementById('clearAllBtn');
    clearAllBtn.addEventListener('click', function() {
        if (!checkAuthentication()) {
            showAuthRequiredMessage();
            return;
        }
        if (confirm('Are you sure you want to clear ALL preferences? This will remove all saved settings and cannot be undone.')) {
            clearAllPreferences();
        }
    });

    // Import/Export buttons
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');

    exportBtn.addEventListener('click', function() {
        if (!checkAuthentication()) {
            showAuthRequiredMessage();
            return;
        }
        exportPreferences();
    });

    importBtn.addEventListener('click', function() {
        if (!checkAuthentication()) {
            showAuthRequiredMessage();
            return;
        }
        importFileInput.click();
    });

    importFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            importPreferences(file);
        }
    });

    // Logout function
    function logoutFromExtPay() {
        // Clear ExtPay storage data from both sync and local storage
        const extpayKeys = [
            'extensionpay_api_key',
            'extensionpay_user', 
            'extensionpay_installed_at'
        ];
        
        // Clear from sync storage first
        chrome.storage.sync.remove(extpayKeys, function() {
            // Then clear from local storage
            chrome.storage.local.remove(extpayKeys, function() {
                console.log('🔐 ExtPay logout successful - cleared both sync and local storage');
                // Reset authentication state
                window.userAuthenticated = false;
                
                // Reset UI to unauthenticated state
                const paymentText = document.getElementById('paymentText');
                paymentText.innerHTML = "🔒 Sign up required to use Tunevo";
                
                // Show trial and login buttons, hide others
                document.getElementById('trialBtn').style.display = "inline-block";
                document.getElementById('loginBtn').style.display = "inline-block";
                document.getElementById('payBtn').style.display = "none";
                document.getElementById('manageBtn').style.display = "none";
                document.getElementById('logoutBtn').style.display = "none";
                
                // Disable extension features
                disableExtensionFeatures();
                
                showNotification('👋 Logged out successfully');
            });
        });
    }

    // Payment button event listeners
    const trialBtn = document.getElementById('trialBtn');
    const loginBtn = document.getElementById('loginBtn');
    const payBtn = document.getElementById('payBtn');
    const manageBtn = document.getElementById('manageBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    trialBtn.addEventListener('click', function(evt) {
        evt.preventDefault();
        extpay.openTrialPage("7-day");
    });

    loginBtn.addEventListener('click', function(evt) {
        evt.preventDefault();
        extpay.openLoginPage();
    });

    payBtn.addEventListener('click', function(evt) {
        evt.preventDefault();
        extpay.openPaymentPage();
    });

    manageBtn.addEventListener('click', function(evt) {
        evt.preventDefault();
        extpay.openPaymentPage();
    });

    logoutBtn.addEventListener('click', function(evt) {
        evt.preventDefault();
        logoutFromExtPay();
    });

    // Load user payment status
    extpay.getUser()
        .then((user) => {
            console.log('🔐 ExtPay user data:', user);
            // Set authentication status
            const isAuthenticated = user.paid || isTrialActive(user);
            window.userAuthenticated = isAuthenticated;
            console.log('🔐 User authenticated:', isAuthenticated);
            updatePaymentUI(user);
        })
        .catch((err) => {
            console.error('ExtPay error:', err);
            // FALLBACK: If ExtPay fails, assume user is authenticated for now
            // This prevents breaking the extension if ExtPay is down
            window.userAuthenticated = true;
            console.log('🔐 ExtPay failed, allowing access as fallback');
            document.getElementById('paymentText').innerHTML = "🚀 Tunevo Ready!";
            enableExtensionFeatures();
        });

    // Listen for payment events
    extpay.onTrialStarted.addListener((user) => {
        console.log('Trial started!', user);
        window.userAuthenticated = true;
        updatePaymentUI(user);
    });

    extpay.onPaid.addListener((user) => {
        console.log('User paid!', user);
        window.userAuthenticated = true;
        updatePaymentUI(user);
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
        
        // Update control buttons state based on streaming mode
        updateControlButtonsState(state.enabled);
        
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
    
    // Update control buttons state based on streaming mode
    updateControlButtonsState(data.enabled);
}

function updateControlButtonsState(streamingModeEnabled) {
    const speedUpBtn = document.getElementById('speedUpId');
    const normalSpeedBtn = document.getElementById('normalSpeedId');
    const slowedBtn = document.getElementById('slowedId');
    
    // Disable buttons when streaming mode is enabled, enable when disabled
    speedUpBtn.disabled = streamingModeEnabled;
    normalSpeedBtn.disabled = streamingModeEnabled;
    slowedBtn.disabled = streamingModeEnabled;
}

function clearAllPreferences() {
    // Clear all chrome.storage.local data
    chrome.storage.local.clear(function() {
        if (chrome.runtime.lastError) {
            console.error('Error clearing storage:', chrome.runtime.lastError);
            showNotification('Error clearing preferences!');
        } else {
            console.log('All preferences cleared successfully');
            showNotification('All preferences cleared!');
            
            // Reset UI to default state
            resetUIToDefault();
            
            // Refresh the current tab to apply changes
            refreshCurrentTab();
            
            // Close the popup
            window.close();
        }
    });
}

function resetUIToDefault() {
    // Reset streaming mode
    const streamingToggle = document.getElementById('streamingToggle');
    const rateSelector = document.getElementById('rateSelector');
    const streamingRate = document.getElementById('streamingRate');
    
    streamingToggle.checked = false;
    rateSelector.style.display = 'none';
    streamingRate.value = 'normal';
    
    // Enable control buttons
    updateControlButtonsState(false);
    
    // Reset setting display
    updateSettingDisplay(null);
    
    // Reset song display
    updateSongDisplay('Loading...');
}

function refreshCurrentTab() {
    // Get the current active tab and refresh it
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.tabs.reload(tabs[0].id, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error refreshing tab:', chrome.runtime.lastError);
                } else {
                    console.log('Tab refreshed successfully');
                }
            });
        }
    });
}

// Export preferences function
function exportPreferences() {
    console.log('📤 Exporting preferences...');
    
    // Get all relevant data from chrome.storage.local
    chrome.storage.local.get(['tunevo_song_settings', 'tunevo_streaming_mode'], function(result) {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            songSettings: result.tunevo_song_settings || {},
            streamingMode: result.tunevo_streaming_mode || { enabled: false, rate: 'normal' }
        };
        
        // Create and download the file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `tunevo-preferences-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        const songCount = Object.keys(exportData.songSettings).length;
        showNotification(`✅ Exported ${songCount} song preferences!`);
        console.log('📤 Export completed:', exportData);
    });
}

// Import preferences function
function importPreferences(file) {
    console.log('📥 Importing preferences from file:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validate the import data structure
            if (!importData.version || !importData.songSettings || !importData.streamingMode) {
                throw new Error('Invalid file format. Please select a valid Tunevo preferences file.');
            }
            
            // Confirm import with user
            const songCount = Object.keys(importData.songSettings).length;
            const confirmMessage = `Import ${songCount} song preferences and streaming mode settings?\n\nThis will replace your current preferences.`;
            
            if (confirm(confirmMessage)) {
                // Import the data
                const dataToImport = {
                    tunevo_song_settings: importData.songSettings,
                    tunevo_streaming_mode: importData.streamingMode
                };
                
                chrome.storage.local.set(dataToImport, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error importing preferences:', chrome.runtime.lastError);
                        showNotification('❌ Error importing preferences!');
                    } else {
                        console.log('📥 Import completed successfully:', dataToImport);
                        showNotification(`✅ Imported ${songCount} song preferences!`);
                        
                        // Refresh the UI to reflect imported settings
                        loadStreamingModeState();
                        loadCurrentSetting();
                        
                        // Refresh the current tab to apply changes
                        refreshCurrentTab();
                    }
                });
            }
        } catch (error) {
            console.error('Error parsing import file:', error);
            showNotification('❌ Invalid file format. Please select a valid Tunevo preferences file.');
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        showNotification('❌ Error reading file. Please try again.');
    };
    
    reader.readAsText(file);
}
