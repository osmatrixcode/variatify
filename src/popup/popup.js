// Popup script to handle button clicks and communicate with content script

document.addEventListener('DOMContentLoaded', function() {
    // Get button elements
    const speedUpBtn = document.getElementById('speedUpId');
    const normalSpeedBtn = document.getElementById('normalSpeedId');
    const slowedBtn = document.getElementById('slowedId');
    const slowedReverbBtn = document.getElementById('slowedReverbId');
    const clearSettingBtn = document.getElementById('clearSettingBtn');
    const debugBtn = document.getElementById('debugBtn');

    // Get song info elements
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const settingText = document.getElementById('settingText');

    // Load current song info when popup opens
    loadCurrentSong();

    // Add event listeners
    speedUpBtn.addEventListener('click', function() {
        sendMessageToContentScript('speedUp');
        showNotification('Speed Up applied!');
        setTimeout(loadCurrentSetting, 500); // Reload setting after applying
    });

    normalSpeedBtn.addEventListener('click', function() {
        sendMessageToContentScript('normalSpeed');
        showNotification('Normal Speed applied!');
        setTimeout(loadCurrentSetting, 500); // Reload setting after applying
    });

    slowedBtn.addEventListener('click', function() {
        sendMessageToContentScript('slowed');
        showNotification('Slowed applied!');
        setTimeout(loadCurrentSetting, 500); // Reload setting after applying
    });

    slowedReverbBtn.addEventListener('click', function() {
        sendMessageToContentScript('slowedReverb');
        showNotification('Slowed + Reverb applied!');
        setTimeout(loadCurrentSetting, 500); // Reload setting after applying
    });

    clearSettingBtn.addEventListener('click', function() {
        sendMessageToContentScript('clearCurrentSetting');
        showNotification('Setting cleared!');
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
                updateSongDisplay('Not playing', 'Spotify');
            } else if (response && response.songInfo) {
                updateSongDisplay(response.songInfo.title, response.songInfo.artist);
            } else {
                updateSongDisplay('Not playing', 'Spotify');
            }
        });
        
        // Also load current setting
        setTimeout(loadCurrentSetting, 100);
    });
}

function updateSongDisplay(title, artist) {
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    
    songTitle.textContent = title || 'Not playing';
    songArtist.textContent = artist || 'Spotify';
}

function sendMessageToContentScript(action) {
    // Get the active tab and send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const activeTab = tabs[0];
        
        chrome.tabs.sendMessage(activeTab.id, {
            action: action,
            source: 'popup'
        }, function(response) {
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
            'slowed': 'Slowed',
            'slowedReverb': 'Slowed + Reverb'
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
