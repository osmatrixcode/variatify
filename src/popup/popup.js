// Popup script to handle button clicks and communicate with content script

document.addEventListener('DOMContentLoaded', function() {
    // Get button elements
    const speedUpBtn = document.getElementById('speedUpId');
    const normalSpeedBtn = document.getElementById('normalSpeedId');
    const slowedBtn = document.getElementById('slowedId');
    const slowedReverbBtn = document.getElementById('slowedReverbId');

    // Get song info elements
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');

    // Load current song info when popup opens
    loadCurrentSong();

    // Add event listeners
    speedUpBtn.addEventListener('click', function() {
        sendMessageToContentScript('speedUp');
    });

    normalSpeedBtn.addEventListener('click', function() {
        sendMessageToContentScript('normalSpeed');
    });

    slowedBtn.addEventListener('click', function() {
        sendMessageToContentScript('slowed');
    });

    slowedReverbBtn.addEventListener('click', function() {
        sendMessageToContentScript('slowedReverb');
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
