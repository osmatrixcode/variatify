// Content script that injects the main script into Spotify's page
console.log("hello from load-main.js");

const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/injected/main.js");
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.source === 'popup') {
        if (request.action === 'getCurrentSong') {
            // Get current song info from Spotify page
            const songInfo = getCurrentSongInfo();
            sendResponse({songInfo: songInfo});
        } else if (request.action === 'getCurrentSetting' || request.action === 'clearCurrentSetting' || request.action === 'listAllSettings') {
            // Forward these messages to the injected script and wait for response
            window.postMessage({
                action: request.action,
                source: 'content-script'
            }, '*');
            
            // Don't send immediate response, wait for injected script response
            return true; // Keep message channel open
        } else {
            // Forward other messages to the injected script
            window.postMessage({
                action: request.action,
                source: 'content-script'
            }, '*');
            
            sendResponse({status: 'Message forwarded to injected script'});
        }
    }
});

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

// Listen for responses from injected script
window.addEventListener('message', function(event) {
    if (event.data.source === 'injected-script') {
        console.log('Response from injected script:', event.data);
        
        // Handle specific responses that need to be sent back to popup
        if (event.data.action === 'currentSetting' || event.data.action === 'settingCleared' || event.data.action === 'allSettings') {
            // Send response back to popup
            chrome.runtime.sendMessage({
                source: 'content-script',
                action: event.data.action,
                data: event.data
            });
        }
    }
});
