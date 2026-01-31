// Variatify Background Service Worker
// Only enables side panel on Spotify pages

const SPOTIFY_URL = 'https://open.spotify.com';

// Check if URL is Spotify and update side panel availability
async function updateSidePanelForTab(tabId, url) {
  const isSpotify = url?.startsWith(SPOTIFY_URL);

  await chrome.sidePanel.setOptions({
    tabId,
    path: isSpotify ? 'src/sidepanel/index.html' : undefined,
    enabled: isSpotify
  });
}

// Listen for tab URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await updateSidePanelForTab(tabId, changeInfo.url);
  }
});

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await updateSidePanelForTab(activeInfo.tabId, tab.url);
});

// Open side panel on icon click (only works when enabled)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
