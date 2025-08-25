//intercept new audio and video elements
const originalCreateElement = document.createElement;
const spotifyPlaybackEls = [];

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
function applyTunevo(rate = 1.25, pitch = false) {
  spotifyPlaybackEls.forEach((el) => {
    el.playbackRate = { source: "tunevo", value: rate };
    el.preservesPitch = pitch;
    console.log(`🎛️ Applied: ${rate}x speed, preservesPitch = ${pitch}`);
  });
}

// Initial delay + mutation observer
const initTunevo = () => {
  const observer = new MutationObserver(() => applyTunevo());
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => applyTunevo(), 1000); // Reapply repeatedly to fight Spotify's resets
};

console.log("🚀 Tunevo initializing...");
setTimeout(() => {
  initTunevo();
  applyTunevo(); // initial force
  console.log("✅ Tunevo running.");
}, 2000);
