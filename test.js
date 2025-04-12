//script that sets playback rate to 1.5x (when post to console devtools at spotify.com)
//we will use this as a base for this coding project

(() => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');

  Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
    get() {
      return descriptor.get.call(this);
    },
    set(value) {
      console.log('🎵 Forcing playbackRate = 1.5x');
      descriptor.set.call(this, 1.5);
    }
  });

  const setPitch = () => {
    document.querySelectorAll('audio, video').forEach(el => {
      if ('preservesPitch' in el) el.preservesPitch = false;
    });
  };

  setPitch();

  const observer = new MutationObserver(() => {
    setPitch();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.log('✅ Overridden playbackRate setter. All media forced to 1.5x with preservePitch off.');
})();
