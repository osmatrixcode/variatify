//intercept new audio and video elements
const originalCreateElement = document.createElement;
const spotifyPlaybackEls = [];

// State management for current effect
let currentEffect = {
  rate: 1.25,
  pitch: false,
  name: 'speedUp'
};

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
      playbackRateDescriptor.set.call(this, 1.25);
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
  console.log("🚀 Speed up effect applied");
}

function normalSpeed() {
  currentEffect = { rate: 1.0, pitch: true, name: 'normalSpeed' };
  applyTunevo(1.0, true);
  console.log("🎵 Normal speed restored");
}

function slowedReverb() {
  currentEffect = { rate: 0.8, pitch: false, name: 'slowedReverb' };
  applyTunevo(0.8, false);
  console.log("🌊 Slowed + reverb effect applied");
}

// Initial delay + mutation observer
const initTunevo = () => {
  const observer = new MutationObserver(() => applyTunevo());
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => applyTunevo(), 1000); // Reapply current effect repeatedly to fight Spotify's resets
};

console.log("🚀 Tunevo initializing...");
setTimeout(() => {
  initTunevo();
  applyTunevo(); // initial force
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
            case 'slowedReverb':
                slowedReverb();
                break;
            default:
                console.log('Unknown action:', event.data.action);
        }
        
        // Send response back to content script
        window.postMessage({
            source: 'injected-script',
            status: 'Action executed: ' + event.data.action
        }, '*');
    }
});
