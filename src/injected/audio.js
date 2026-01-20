// Audio Module
// Handles playback rate manipulation for Spotify audio elements

// Track all audio/video elements created on the page
const spotifyPlaybackEls = [];

// Intercept createElement to capture audio/video elements
const originalCreateElement = document.createElement;
document.createElement = function(tagName, ...args) {
  const el = originalCreateElement.call(this, tagName, ...args);
  if (tagName === 'audio' || tagName === 'video') {
    spotifyPlaybackEls.push(el);
  }
  return el;
};

// Store original playbackRate descriptor before overriding
const playbackRateDescriptor = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  'playbackRate'
);

// Override playbackRate to prevent Spotify from resetting our custom rates
Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
  set(value) {
    // Ignore Spotify's fake canvas audio elements
    if (this.parentElement?.className.toLowerCase().includes('canvas')) {
      playbackRateDescriptor.set.call(this, 1);
      return;
    }

    // Only allow changes from Variatify (identified by source property)
    if (value.source !== 'variatify') {
      playbackRateDescriptor.set.call(this, window.variatifyState?.currentEffect?.rate || 1.0);
    } else {
      playbackRateDescriptor.set.call(this, value.value);
    }
  },
  get() {
    return playbackRateDescriptor.get.call(this);
  }
});

/**
 * Apply effect to all tracked audio/video elements
 * @param {number} rate - Playback rate
 * @param {boolean} pitch - Whether to preserve pitch
 */
function applyEffect(rate, pitch) {
  spotifyPlaybackEls.forEach((el) => {
    el.playbackRate = { source: 'variatify', value: rate };
    el.preservesPitch = pitch;
  });
}

/**
 * Get effect values from effect name
 * @param {string} effectName - Effect name ('speedUp', 'normalSpeed', 'slowed')
 * @returns {{rate: number, pitch: boolean, name: string}} Effect object
 */
function getEffectByName(effectName) {
  switch (effectName) {
    case 'speedUp':
      return { ...VARIATIFY.EFFECTS.SPEED_UP };
    case 'normalSpeed':
      return { ...VARIATIFY.EFFECTS.NORMAL };
    case 'slowed':
      return { ...VARIATIFY.EFFECTS.SLOWED };
    default:
      return { ...VARIATIFY.EFFECTS.NORMAL };
  }
}

/**
 * Get effect values from streaming rate name
 * @param {string} rate - Streaming rate ('speedUp', 'normal', 'slowed')
 * @returns {{rate: number, pitch: boolean}} Rate values
 */
function getStreamingRateValues(rate) {
  switch (rate) {
    case 'speedUp':
      return { rate: 1.25, pitch: false };
    case 'slowed':
      return { rate: 0.8, pitch: false };
    case 'normal':
    default:
      return { rate: 1.0, pitch: true };
  }
}
