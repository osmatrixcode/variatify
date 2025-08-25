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
      playbackRateDescriptor.set.call(this, currentEffect.rate);
    } else {
      playbackRateDescriptor.set.call(this, value.value);
    }
  },
  get() {
    return playbackRateDescriptor.get.call(this);
  },
});

// Setup reverb for an audio/video element
function setupReverbForElement(element) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create a reverb node for this element
    const reverbNode = createReverbNode(audioContext);
    reverbNodes.set(element, reverbNode);
    
    // Connect the element to the reverb
    const source = audioContext.createMediaElementSource(element);
    source.connect(reverbNode.input);
    reverbNode.output.connect(audioContext.destination);
    
    console.log("🎵 Reverb setup for element");
  } catch (error) {
    console.log("⚠️ Could not setup reverb:", error);
  }
}

// Create a simple reverb effect
function createReverbNode(audioContext) {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  
  // Create delay lines for reverb
  const delays = [0.1, 0.2, 0.3, 0.4, 0.5];
  const delayNodes = delays.map(delay => {
    const delayNode = audioContext.createDelay(delay);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3; // Reverb intensity
    delayNode.connect(gainNode);
    gainNode.connect(output);
    return delayNode;
  });
  
  // Connect input to all delay lines
  delays.forEach((_, index) => {
    input.connect(delayNodes[index]);
  });
  
  // Direct connection (dry signal)
  const dryGain = audioContext.createGain();
  dryGain.gain.value = 0.7; // Dry signal level
  input.connect(dryGain);
  dryGain.connect(output);
  
  return { input, output };
}

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

function slowed() {
  currentEffect = { rate: 0.8, pitch: false, name: 'slowed' };
  applyTunevo(0.8, false);
  console.log("🐌 Slowed effect applied");
}

function slowedReverb() {
  currentEffect = { rate: 0.8, pitch: false, name: 'slowedReverb' };
  
  spotifyPlaybackEls.forEach((el) => {
    // Apply slower speed
    el.playbackRate = { source: "tunevo", value: 0.8 };
    el.preservesPitch = false;
    
    // Create reverb-like effect by adjusting audio properties
    el.volume = 0.75; // Lower volume for more atmospheric effect
    
    // Add some bass boost effect by manipulating audio context if available
    if (el.mozAudioChannelType) {
      el.mozAudioChannelType = 'content';
    }
    
    // Add reverb-like properties
    if (el.style) {
      el.style.filter = 'contrast(1.2) saturate(1.1)'; // Enhance audio characteristics
    }
    
    // Try to add some "room" effect by manipulating audio properties
    if (el.audioTracks) {
      // This can help create a more "spatial" sound
      el.audioTracks = el.audioTracks;
    }
    
    console.log(`🌊 Applied: 0.8x speed with enhanced reverb effect`);
  });
  
  // Create a subtle echo effect by temporarily duplicating the audio
  setTimeout(() => {
    spotifyPlaybackEls.forEach((el) => {
      if (el.src && el.src !== '') {
        // Create a hidden audio element for echo
        const echoEl = document.createElement('audio');
        echoEl.src = el.src;
        echoEl.currentTime = el.currentTime;
        echoEl.volume = 0.15; // Very quiet echo
        echoEl.playbackRate = 0.8;
        echoEl.preservesPitch = false;
        echoEl.style.display = 'none';
        
        // Start echo with delay
        setTimeout(() => {
          echoEl.play().catch(() => {}); // Ignore errors
        }, 150);
        
        // Remove echo after 3 seconds
        setTimeout(() => {
          echoEl.pause();
          echoEl.remove();
        }, 3000);
        
        document.body.appendChild(echoEl);
      }
    });
  }, 500);
  
  console.log("🌊 Slowed + enhanced reverb effect applied");
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
            case 'slowed':
                slowed();
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
