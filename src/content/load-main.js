// Content script that injects the main script into Spotify's page
console.log("hello from load-main.js");

const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/injected/main.js");
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Chrome storage functions
async function saveSongSetting(songId, effect) {
  try {
    const result = await chrome.storage.local.get('tunevo_song_settings');
    const songSettings = result.tunevo_song_settings || {};
    songSettings[songId] = effect;
    await chrome.storage.local.set({ tunevo_song_settings: songSettings });
    console.log(`💾 Saved setting for "${songId}":`, effect);
    return true;
  } catch (error) {
    console.error('Error saving song setting:', error);
    return false;
  }
}

async function loadSongSetting(songId) {
  try {
    const result = await chrome.storage.local.get('tunevo_song_settings');
    const songSettings = result.tunevo_song_settings || {};
    const setting = songSettings[songId];
    if (setting) {
      console.log(`📂 Loaded setting for "${songId}":`, setting);
      return setting;
    }
  } catch (error) {
    console.error('Error loading song setting:', error);
  }
  return null;
}

async function clearSongSetting(songId) {
  try {
    const result = await chrome.storage.local.get('tunevo_song_settings');
    const songSettings = result.tunevo_song_settings || {};
    delete songSettings[songId];
    await chrome.storage.local.set({ tunevo_song_settings: songSettings });
    console.log(`🗑️ Cleared setting for "${songId}"`);
    return true;
  } catch (error) {
    console.error('Error clearing song setting:', error);
    return false;
  }
}

async function listAllSavedSettings() {
  try {
    const result = await chrome.storage.local.get('tunevo_song_settings');
    const songSettings = result.tunevo_song_settings || {};
    console.log('📋 All saved song settings:', songSettings);
    return songSettings;
  } catch (error) {
    console.error('Error listing saved settings:', error);
    return {};
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.source === 'popup') {
        if (request.action === 'getCurrentSong') {
            // Get current song info from Spotify page
            const songInfo = getCurrentSongInfo();
            sendResponse({songInfo: songInfo});
        } else if (request.action === 'getCurrentSetting' || request.action === 'clearCurrentSetting' || request.action === 'listAllSettings') {
            // Check authentication before processing
            if (!checkContentScriptAuthentication()) {
                sendResponse({error: 'Authentication required'});
                return;
            }
            // Forward these messages to the injected script and wait for response
            window.postMessage({
                action: request.action,
                source: 'content-script'
            }, '*');
            
            // Don't send immediate response, wait for injected script response
            return true; // Keep message channel open
        } else if (request.action === 'enableStreamingMode' || request.action === 'disableStreamingMode' || request.action === 'updateStreamingRate') {
            // Check authentication before processing
            if (!checkContentScriptAuthentication()) {
                sendResponse({error: 'Authentication required'});
                return;
            }
            // Forward streaming mode messages to the injected script
            window.postMessage({
                action: request.action,
                data: request.data,
                source: 'content-script'
            }, '*');
            
            sendResponse({status: 'Streaming mode message forwarded to injected script'});
        } else if (request.action === 'setAuthenticationStatus') {
            // Handle authentication status updates from popup
            window.contentScriptAuthenticated = request.authenticated;
            console.log('🔐 Content script authentication status updated:', request.authenticated);
            
            // Forward to injected script
            window.postMessage({
                action: 'setAuthenticationStatus',
                authenticated: request.authenticated,
                source: 'content-script'
            }, '*');
            
            sendResponse({status: 'Authentication status updated'});
        } else {
            // Check authentication before processing
            if (!checkContentScriptAuthentication()) {
                sendResponse({error: 'Authentication required'});
                return;
            }
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
        
        // Handle storage operations from injected script
        if (event.data.action === 'saveSongSetting') {
            saveSongSetting(event.data.songId, event.data.effect).then(success => {
                window.postMessage({
                    source: 'content-script',
                    action: 'saveSongSettingResponse',
                    success: success
                }, '*');
            });
        } else if (event.data.action === 'loadSongSetting') {
            loadSongSetting(event.data.songId).then(setting => {
                window.postMessage({
                    source: 'content-script',
                    action: 'loadSongSettingResponse',
                    songId: event.data.songId,
                    setting: setting
                }, '*');
            });
        } else if (event.data.action === 'clearSongSetting') {
            clearSongSetting(event.data.songId).then(success => {
                window.postMessage({
                    source: 'content-script',
                    action: 'clearSongSettingResponse',
                    songId: event.data.songId,
                    success: success
                }, '*');
            });
        } else if (event.data.action === 'listAllSettings') {
            listAllSavedSettings().then(settings => {
                window.postMessage({
                    source: 'content-script',
                    action: 'listAllSettingsResponse',
                    settings: settings
                }, '*');
            });
        }
        
        // Handle specific responses that need to be sent back to popup
        if (event.data.action === 'currentSetting' || event.data.action === 'settingCleared' || event.data.action === 'allSettings') {
            console.log('🔧 Forwarding message to popup:', event.data.action, event.data);
            // Send response back to popup
            chrome.runtime.sendMessage({
                source: 'content-script',
                action: event.data.action,
                data: event.data
            });
        } else if (event.data.action === 'songChanged') {
            console.log('🎵 Song changed, notifying popup:', event.data.songInfo);
            // Send song change notification to popup
            chrome.runtime.sendMessage({
                source: 'content-script',
                action: 'songChanged',
                songInfo: event.data.songInfo
            });
        }
    }
});

// Payment status indicator for Spotify pages
const extpay = ExtPay("tunevo-test");

// Check authentication status in content script
function checkContentScriptAuthentication() {
  // This will be set by the ExtPay user status check
  console.log('🔐 Content script authentication:', window.contentScriptAuthenticated);
  return window.contentScriptAuthenticated || false;
}

// Check user status and show appropriate indicator
extpay.getUser().then((user) => {
  // Set authentication status
  const isTrialActive = user.trialStartedAt && (() => {
    const now = new Date();
    const trialEnd = new Date(user.trialStartedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
    return now < trialEnd;
  })();
  
  window.contentScriptAuthenticated = user.paid || isTrialActive;
  
  // Send authentication status to injected script
  window.postMessage({
    source: 'content-script',
    action: 'setAuthenticationStatus',
    authenticated: window.contentScriptAuthenticated
  }, '*');
  
  // Only show payment status if user is not paid and trial is expired
  if (!user.paid && user.trialStartedAt) {
    const now = new Date();
    const trialEnd = new Date(user.trialStartedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
    if (now >= trialEnd) {
      // Trial expired - show upgrade prompt
      showPaymentPrompt();
    }
  }
}).catch((err) => {
  console.error('ExtPay error in content script:', err);
  // FALLBACK: If ExtPay fails, assume user is authenticated for now
  window.contentScriptAuthenticated = true;
  console.log('🔐 Content script: ExtPay failed, allowing access as fallback');
  
  // Send authentication status to injected script (fallback case)
  window.postMessage({
    source: 'content-script',
    action: 'setAuthenticationStatus',
    authenticated: window.contentScriptAuthenticated
  }, '*');
});

function showPaymentPrompt() {
  // Create a subtle payment prompt
  const prompt = document.createElement("div");
  prompt.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 250px;
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  
  prompt.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>🎧</span>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Tunevo Premium</div>
        <div style="font-size: 12px; opacity: 0.9;">Trial expired - Upgrade now!</div>
      </div>
    </div>
  `;
  
  prompt.addEventListener('click', () => {
    extpay.openPaymentPage();
  });
  
  prompt.addEventListener('mouseenter', () => {
    prompt.style.transform = 'translateY(-2px)';
    prompt.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
  });
  
  prompt.addEventListener('mouseleave', () => {
    prompt.style.transform = 'translateY(0)';
    prompt.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  });
  
  document.body.appendChild(prompt);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (prompt.parentNode) {
      prompt.style.opacity = '0';
      prompt.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (prompt.parentNode) {
          prompt.parentNode.removeChild(prompt);
        }
      }, 300);
    }
  }, 10000);
}
