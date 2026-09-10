(() => {
  if (window.SEAL_TUTORIALS) { window.SEAL_TUTORIALS.refresh(); return; }
  const prepared = new WeakSet();
  const refresh = () => document.querySelectorAll('.tutorial-video video').forEach((video) => {
    if (prepared.has(video)) return;
    prepared.add(video);
    const lesson = video.closest('.tutorial-video');
    lesson.querySelector('.lesson-chapters')?.removeAttribute('hidden');
    video.addEventListener('play', () => document.querySelectorAll('.tutorial-video video').forEach((other) => { if (other !== video) other.pause(); }));
    lesson.querySelectorAll('[data-seek]').forEach((button) => {
      button.addEventListener('click', () => {
        const time = Number(button.dataset.seek);
        if (!Number.isFinite(time) || time < 0) return;
        const seek = () => { if (video.isConnected) video.currentTime = Math.min(time, Number.isFinite(video.duration) ? video.duration : time); };
        if (video.readyState >= 1) seek();
        else video.addEventListener('loadedmetadata', seek, { once: true });
        video.scrollIntoView({ block: 'center', behavior: 'instant' });
        video.focus({ preventScroll: true });
        video.play().catch(() => { if (video.isConnected) video.focus(); });
      });
    });
  });
  window.SEAL_TUTORIALS = { refresh };
  window.addEventListener('seal-docs-page-change', refresh);
  window.addEventListener('seal-docs-before-page-change', () => {
    document.querySelectorAll('.tutorial-video video').forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.querySelectorAll('source').forEach((source) => source.removeAttribute('src'));
      video.load();
    });
  });
  refresh();
})();
