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

// Listen for responses from injected script
window.addEventListener('message', function(event) {
    if (event.data.source === 'injected-script') {
        console.log('Response from injected script:', event.data);
    }
});
