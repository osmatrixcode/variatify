// Song Detection Module
// Handles detecting the currently playing song on Spotify

/**
 * Get current song info from the Spotify page
 * @returns {{title: string}} Song info object
 */
function getCurrentSongInfo() {
  try {
    let title = 'Not playing';

    // Try each selector until we find the song title
    for (const selector of VARIATIFY.SELECTORS.SONG_TITLE) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        title = element.textContent.trim();
        break;
      }
    }

    // Fallback: try to get from page title (format: "Song - Artist • Spotify")
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
    console.error('Variatify: Error getting song info:', error);
    return { title: 'Not playing' };
  }
}

/**
 * Convert song title to a consistent ID format
 * @param {string} title - Song title
 * @returns {string} Lowercase trimmed song ID
 */
function getSongId(title) {
  return title.toLowerCase().trim();
}
