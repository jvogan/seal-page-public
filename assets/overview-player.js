(() => {
  const video = document.querySelector('#overview-video');
  const launch = document.querySelector('#overview-launch');
  const label = document.querySelector('#overview-launch-text');
  const status = document.querySelector('#overview-player-status');
  if (!video || !launch || !label || !status) return;

  // Native controls remain available when JavaScript is disabled.
  video.controls = false;
  video.tabIndex = -1;
  launch.hidden = false;

  const revealControls = () => {
    video.controls = true;
    video.tabIndex = 0;
    launch.hidden = true;
    if (document.activeElement === launch || document.activeElement === document.body) {
      video.focus({ preventScroll: true });
    }
  };

  launch.addEventListener('click', async () => {
    launch.disabled = true;
    label.textContent = 'Loading video…';
    status.textContent = '';
    try {
      await video.play();
      revealControls();
    } catch {
      // A rejected play request leaves the native player and direct link usable.
      revealControls();
      status.textContent = 'Use the player controls to start playback, or open the overview guide.';
    } finally {
      launch.disabled = false;
    }
  });
})();
