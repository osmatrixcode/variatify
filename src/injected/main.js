//intercept new audio and video elements
const originalCreateElement = document.createElement;
const spotifyPlaybackEls = [];

// State management for current effect
let currentEffect = {
  rate: 1.00,
  pitch: true,
  name: 'normal speed'
};

// Current song tracking
let currentSongId = null;

// Modal and button state
let tunevoButton = null;
let tunevoModal = null;
let isModalOpen = false;


// Local storage functions for song settings
function getSongId(title) {
  return title.toLowerCase().trim();
}

function saveSongSetting(songId, effect) {
  try {
    const songSettings = JSON.parse(localStorage.getItem('tunevo_song_settings') || '{}');
    songSettings[songId] = effect;
    localStorage.setItem('tunevo_song_settings', JSON.stringify(songSettings));
    console.log(`💾 Saved setting for "${songId}":`, effect);
  } catch (error) {
    console.error('Error saving song setting:', error);
  }
}

function loadSongSetting(songId) {
  try {
    const songSettings = JSON.parse(localStorage.getItem('tunevo_song_settings') || '{}');
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

function checkForSongChange() {
  const songInfo = getCurrentSongInfo();
  const newSongId = getSongId(songInfo.title);
  
  if (newSongId !== currentSongId && songInfo.title !== 'Not playing') {
    console.log(`🎵 Song changed from "${currentSongId}" to "${newSongId}"`);
    currentSongId = newSongId;
    
    // Load and apply saved setting for this song
    const savedSetting = loadSongSetting(newSongId);
    if (savedSetting) {
      console.log(`🔄 Applying saved setting for "${newSongId}":`, savedSetting);
      applyEffectByName(savedSetting.name);
    } else {
      console.log(`📝 No saved setting found for "${newSongId}", resetting to normal speed`);
      // Reset to normal speed when no saved setting (don't save this as a setting)
      applyNormalSpeedWithoutSaving();
    }
    
    // Update modal display if it's open
    if (isModalOpen) {
      updateModalDisplay();
    }
  }
  
  // Debug: Log current song info periodically (less verbose)
  if (songInfo.title !== 'Not playing' && Math.random() < 0.1) { // Only log 10% of the time
    console.log(`🎵 Currently playing: "${songInfo.title}" (ID: ${newSongId})`);
  }
}

function applyEffectByName(effectName) {
  switch(effectName) {
    case 'speedUp':
      speedUp();
      break;
    case 'normalSpeed':
      normalSpeed();
      break;
    case 'slowed':
      slowed();
      break;
    default:
      console.log('Unknown effect name:', effectName);
  }
}

function getCurrentSongSetting() {
  if (!currentSongId) return null;
  return loadSongSetting(currentSongId);
}

function clearSongSetting(songId) {
  try {
    const songSettings = JSON.parse(localStorage.getItem('tunevo_song_settings') || '{}');
    delete songSettings[songId];
    localStorage.setItem('tunevo_song_settings', JSON.stringify(songSettings));
    console.log(`🗑️ Cleared setting for "${songId}"`);
  } catch (error) {
    console.error('Error clearing song setting:', error);
  }
}

function listAllSavedSettings() {
  try {
    const songSettings = JSON.parse(localStorage.getItem('tunevo_song_settings') || '{}');
    console.log('📋 All saved song settings:', songSettings);
    return songSettings;
  } catch (error) {
    console.error('Error listing saved settings:', error);
    return {};
  }
}

document.createElement = function (tagName, ...args) {
  const el = originalCreateElement.call(this, tagName, ...args);
  if (tagName === "audio" || tagName === "video") {
    spotifyPlaybackEls.push(el);
  }
  return el;
};

// Store the original playbackRate descriptor
const playbackRateDescriptor = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  "playbackRate"
);

// Set playback rate
Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
  set(value) {
    if (this.parentElement?.className.toLowerCase().includes("canvas")) {
      playbackRateDescriptor.set.call(this, 1); // Ignore Spotify's fake canvas audio
      return;
    }

    if (value.source !== "tunevo") {
      console.info("🎧 Tunevo: Prevented unintended playback rate change.");
      playbackRateDescriptor.set.call(this, currentEffect.rate);
    } else {
      playbackRateDescriptor.set.call(this, value.value);
    }
  },
  get() {
    return playbackRateDescriptor.get.call(this);
  },
});



// Enforce pitch + speed
function applyTunevo(rate = null, pitch = null) {
  // Use current effect if no parameters provided
  const targetRate = rate !== null ? rate : currentEffect.rate;
  const targetPitch = pitch !== null ? pitch : currentEffect.pitch;
  
  spotifyPlaybackEls.forEach((el) => {
    el.playbackRate = { source: "tunevo", value: targetRate };
    el.preservesPitch = targetPitch;
    console.log(`🎛️ Applied: ${targetRate}x speed, preservesPitch = ${targetPitch}`);
  });
}

// New functions for different effects
function speedUp() {
  currentEffect = { rate: 1.25, pitch: false, name: 'speedUp' };
  applyTunevo(1.25, false);
  
  // Save setting for current song
  if (currentSongId) {
    saveSongSetting(currentSongId, currentEffect);
  }
  
  console.log("🚀 Speed up effect applied");
}

function normalSpeed() {
  currentEffect = { rate: 1.0, pitch: true, name: 'normalSpeed' };
  applyTunevo(1.0, true);
  
  // Save setting for current song
  if (currentSongId) {
    saveSongSetting(currentSongId, currentEffect);
  }
  
  console.log("🎵 Normal speed restored");
}

function slowed() {
  currentEffect = { rate: 0.8, pitch: false, name: 'slowed' };
  applyTunevo(0.8, false);
  
  // Save setting for current song
  if (currentSongId) {
    saveSongSetting(currentSongId, currentEffect);
  }
  
  console.log("🐌 Slowed effect applied");
}

// Apply normal speed without saving (for when no saved setting exists)
function applyNormalSpeedWithoutSaving() {
  currentEffect = { rate: 1.0, pitch: true, name: 'normalSpeed' };
  applyTunevo(1.0, true);
  console.log("🎵 Reset to normal speed (no saved setting)");
}





// Create floating button
function createTunevoButton() {
  if (tunevoButton) return; // Already exists
  
  tunevoButton = document.createElement('div');
  tunevoButton.id = 'tunevo-floating-btn';
  tunevoButton.innerHTML = '🎧';
  tunevoButton.title = 'Tunevo - Transform your Spotify experience (Drag to move)';
  
  // Load saved position or use default
  const savedPosition = JSON.parse(localStorage.getItem('tunevo_button_position') || '{}');
  const defaultPosition = { x: window.innerWidth - 70, y: window.innerHeight - 70 };
  const position = {
    x: savedPosition.x !== undefined ? savedPosition.x : defaultPosition.x,
    y: savedPosition.y !== undefined ? savedPosition.y : defaultPosition.y
  };
  
  // Add styles
  tunevoButton.style.cssText = `
    position: fixed;
    left: ${position.x}px;
    top: ${position.y}px;
    width: 50px;
    height: 50px;
    background: #1DB954;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    cursor: grab;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
    transition: all 0.2s ease;
    border: 2px solid white;
    user-select: none;
    touch-action: none;
  `;
  
  // Hover effects
  tunevoButton.addEventListener('mouseenter', () => {
    if (!tunevoButton.classList.contains('dragging')) {
      tunevoButton.style.transform = 'scale(1.1)';
      tunevoButton.style.boxShadow = '0 6px 16px rgba(29, 185, 84, 0.4)';
    }
  });
  
  tunevoButton.addEventListener('mouseleave', () => {
    if (!tunevoButton.classList.contains('dragging')) {
      tunevoButton.style.transform = 'scale(1)';
      tunevoButton.style.boxShadow = '0 4px 12px rgba(29, 185, 84, 0.3)';
    }
  });
  
  // Click to open modal (only if not dragging)
  tunevoButton.addEventListener('click', (e) => {
    if (!tunevoButton.classList.contains('dragging')) {
      toggleTunevoModal();
    }
  });
  
  // Drag and drop functionality
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  
  tunevoButton.addEventListener('mousedown', (e) => {
    isDragging = true;
    tunevoButton.classList.add('dragging');
    tunevoButton.style.cursor = 'grabbing';
    tunevoButton.style.transform = 'scale(1.05)';
    tunevoButton.style.boxShadow = '0 8px 20px rgba(29, 185, 84, 0.5)';
    
    const rect = tunevoButton.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep button within viewport bounds
    const maxX = window.innerWidth - 50;
    const maxY = window.innerHeight - 50;
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));
    
    tunevoButton.style.left = constrainedX + 'px';
    tunevoButton.style.top = constrainedY + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      tunevoButton.classList.remove('dragging');
      tunevoButton.style.cursor = 'grab';
      tunevoButton.style.transform = 'scale(1)';
      tunevoButton.style.boxShadow = '0 4px 12px rgba(29, 185, 84, 0.3)';
      
      // Save position to localStorage
      const rect = tunevoButton.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.top
      };
      localStorage.setItem('tunevo_button_position', JSON.stringify(position));
    }
  });
  
  // Touch support for mobile devices
  tunevoButton.addEventListener('touchstart', (e) => {
    isDragging = true;
    tunevoButton.classList.add('dragging');
    tunevoButton.style.cursor = 'grabbing';
    tunevoButton.style.transform = 'scale(1.05)';
    tunevoButton.style.boxShadow = '0 8px 20px rgba(29, 185, 84, 0.5)';
    
    const rect = tunevoButton.getBoundingClientRect();
    const touch = e.touches[0];
    dragOffset.x = touch.clientX - rect.left;
    dragOffset.y = touch.clientY - rect.top;
    
    e.preventDefault();
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;
    
    // Keep button within viewport bounds
    const maxX = window.innerWidth - 50;
    const maxY = window.innerHeight - 50;
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));
    
    tunevoButton.style.left = constrainedX + 'px';
    tunevoButton.style.top = constrainedY + 'px';
    
    e.preventDefault();
  });
  
  document.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      tunevoButton.classList.remove('dragging');
      tunevoButton.style.cursor = 'grab';
      tunevoButton.style.transform = 'scale(1)';
      tunevoButton.style.boxShadow = '0 4px 12px rgba(29, 185, 84, 0.3)';
      
      // Save position to localStorage
      const rect = tunevoButton.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.top
      };
      localStorage.setItem('tunevo_button_position', JSON.stringify(position));
    }
  });
  
  document.body.appendChild(tunevoButton);
}

// Create modal popup
function createTunevoModal() {
  if (tunevoModal) return; // Already exists
  
  tunevoModal = document.createElement('div');
  tunevoModal.id = 'tunevo-modal';
  tunevoModal.innerHTML = `
    <div class="tunevo-modal-overlay">
      <div class="tunevo-modal-content">
        <div class="tunevo-modal-header">
          <h2>🎧 Tunevo</h2>
          <button class="tunevo-modal-close" id="tunevo-modal-close">×</button>
        </div>
        <div class="tunevo-modal-body">
          <p class="tunevo-modal-subtitle">Transform your Spotify experience</p>
          
          <div class="tunevo-current-song">
            <div class="tunevo-song-info">
              <span class="tunevo-song-title" id="tunevo-song-title">Loading...</span>
            </div>
            <div class="tunevo-setting-status">
              <span class="tunevo-setting-text" id="tunevo-setting-text">No saved setting</span>
            </div>
          </div>
          
          <div class="tunevo-controls">
            <button class="tunevo-control-btn tunevo-speed-up" id="tunevo-speed-up">
              <div class="tunevo-btn-content">
                <span class="tunevo-btn-emoji">🚀</span>
                <span>Speed Up</span>
              </div>
            </button>
            
            <button class="tunevo-control-btn tunevo-normal" id="tunevo-normal">
              <div class="tunevo-btn-content">
                <span class="tunevo-btn-emoji">🎵</span>
                <span>Normal Speed</span>
              </div>
            </button>
            
            <button class="tunevo-control-btn tunevo-slowed" id="tunevo-slowed">
              <div class="tunevo-btn-content">
                <span class="tunevo-btn-emoji">🐌</span>
                <span>Slowed</span>
              </div>
            </button>
          </div>
          
          <div class="tunevo-footer">
            <a href="https://www.buymeacoffee.com/tunevo" target="_blank" class="tunevo-buy-coffee">
              ☕ Buy me a coffee
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .tunevo-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .tunevo-modal-content {
      background: white;
      border-radius: 12px;
      width: 320px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      transform: scale(0.9);
      transition: transform 0.3s ease;
    }
    
    .tunevo-modal-header {
      background: #1DB954;
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .tunevo-modal-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .tunevo-modal-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s ease;
    }
    
    .tunevo-modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .tunevo-modal-body {
      padding: 20px;
    }
    
    .tunevo-modal-subtitle {
      color: #6d7175;
      font-size: 14px;
      margin: 0 0 16px 0;
      text-align: center;
    }
    
    .tunevo-current-song {
      background: #f6f6f7;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }
    
    .tunevo-song-title {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #202223;
      margin-bottom: 4px;
    }
    
    .tunevo-setting-text {
      font-size: 11px;
      color: #6d7175;
      font-style: italic;
    }
    
    .tunevo-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .tunevo-control-btn {
      width: 100%;
      background: white;
      border: 1px solid #e1e3e5;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    
    .tunevo-control-btn:hover {
      border-color: #1DB954;
      box-shadow: 0 2px 4px rgba(29, 185, 84, 0.1);
      transform: translateY(-1px);
    }
    
    .tunevo-btn-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .tunevo-btn-emoji {
      font-size: 20px;
      width: 24px;
      text-align: center;
    }
    
    .tunevo-control-btn span:last-child {
      font-size: 14px;
      font-weight: 500;
      color: #202223;
    }
    
    .tunevo-speed-up {
      border-left: 4px solid #50b83c;
    }
    
    .tunevo-normal {
      border-left: 4px solid #1DB954;
    }
    
    .tunevo-slowed {
      border-left: 4px solid #f49342;
    }
    
    .tunevo-footer {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid #e1e3e5;
    }
    
    .tunevo-buy-coffee {
      display: inline-block;
      background: #ffdd00;
      color: #000000;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(255, 221, 0, 0.3);
      border: 1px solid #e6c700;
    }
    
    .tunevo-buy-coffee:hover {
      background: #ffed4e;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(255, 221, 0, 0.4);
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(tunevoModal);
  
  // Add event listeners
  document.getElementById('tunevo-modal-close').addEventListener('click', () => {
    toggleTunevoModal();
  });
  
  document.getElementById('tunevo-speed-up').addEventListener('click', () => {
    speedUp();
    updateModalDisplay();
  });
  
  document.getElementById('tunevo-normal').addEventListener('click', () => {
    normalSpeed();
    updateModalDisplay();
  });
  
  document.getElementById('tunevo-slowed').addEventListener('click', () => {
    slowed();
    updateModalDisplay();
  });
  
  // Close modal when clicking overlay
  tunevoModal.querySelector('.tunevo-modal-overlay').addEventListener('click', (e) => {
    if (e.target.classList.contains('tunevo-modal-overlay')) {
      toggleTunevoModal();
    }
  });
}

// Toggle modal visibility
function toggleTunevoModal() {
  if (!tunevoModal) {
    createTunevoModal();
  }
  
  if (isModalOpen) {
    // Close modal
    tunevoModal.style.display = 'none';
    isModalOpen = false;
  } else {
    // Open modal
    tunevoModal.style.display = 'flex';
    isModalOpen = true;
    updateModalDisplay();
    
    // Animate in
    setTimeout(() => {
      tunevoModal.querySelector('.tunevo-modal-overlay').style.opacity = '1';
      tunevoModal.querySelector('.tunevo-modal-content').style.transform = 'scale(1)';
    }, 10);
  }
}

// Update modal display with current song and setting
function updateModalDisplay() {
  const songTitle = document.getElementById('tunevo-song-title');
  const settingText = document.getElementById('tunevo-setting-text');
  
  if (songTitle) {
    const songInfo = getCurrentSongInfo();
    songTitle.textContent = songInfo.title;
  }
  
  if (settingText) {
    const currentSetting = getCurrentSongSetting();
    if (currentSetting) {
      const settingNames = {
        'speedUp': 'Speed Up',
        'normalSpeed': 'Normal Speed',
        'slowed': 'Slowed'
      };
      settingText.textContent = `Saved: ${settingNames[currentSetting.name] || currentSetting.name}`;
    } else {
      settingText.textContent = 'No saved setting';
    }
  }
}

// Initial delay + mutation observer
const initTunevo = () => {
  const observer = new MutationObserver(() => {
    applyTunevo();
    checkForSongChange(); // Check for song changes
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    applyTunevo(); // Reapply current effect repeatedly to fight Spotify's resets
    checkForSongChange(); // Check for song changes
  }, 1000);
};

console.log("🚀 Tunevo initializing...");
setTimeout(() => {
  initTunevo();
  applyTunevo(); // initial force
  
  // Create floating button
  createTunevoButton();
  
  // Initialize current song ID
  const songInfo = getCurrentSongInfo();
  currentSongId = getSongId(songInfo.title);
  
  // Load and apply saved setting for current song if available
  if (currentSongId && songInfo.title !== 'Not playing') {
    const savedSetting = loadSongSetting(currentSongId);
    if (savedSetting) {
      console.log(`🔄 Applying saved setting for current song "${currentSongId}":`, savedSetting);
      applyEffectByName(savedSetting.name);
    }
  }
  
  console.log("✅ Tunevo running.");
}, 2000);

// Listen for messages from content script
window.addEventListener('message', function(event) {
    if (event.data.source === 'content-script') {
        console.log('Received message from popup:', event.data.action);
        
        switch(event.data.action) {
            case 'speedUp':
                speedUp();
                break;
            case 'normalSpeed':
                normalSpeed();
                break;
            case 'slowed':
                slowed();
                break;
            case 'getCurrentSetting':
                const currentSetting = getCurrentSongSetting();
                window.postMessage({
                    source: 'injected-script',
                    action: 'currentSetting',
                    setting: currentSetting
                }, '*');
                break;
            case 'clearCurrentSetting':
                if (currentSongId) {
                    clearSongSetting(currentSongId);
                }
                window.postMessage({
                    source: 'injected-script',
                    action: 'settingCleared',
                    songId: currentSongId
                }, '*');
                break;
            case 'listAllSettings':
                const allSettings = listAllSavedSettings();
                window.postMessage({
                    source: 'injected-script',
                    action: 'allSettings',
                    settings: allSettings
                }, '*');
                break;
            default:
                console.log('Unknown action:', event.data.action);
        }
        
        // Send response back to content script for regular actions
        if (!['getCurrentSetting', 'clearCurrentSetting'].includes(event.data.action)) {
            window.postMessage({
                source: 'injected-script',
                status: 'Action executed: ' + event.data.action
            }, '*');
        }
    }
});
