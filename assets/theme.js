(() => {
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let saved;
  try { saved = localStorage.getItem('seal-theme'); } catch {}
  if (saved !== 'light' && saved !== 'dark') saved = null;

  const apply = (theme) => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = theme === 'dark' ? '#0d0d0d' : '#ffffff';
    window.dispatchEvent(new CustomEvent('seal-theme-change'));
  };

  window.SEAL_THEME = {
    set(theme) {
      if (theme !== 'light' && theme !== 'dark') return;
      saved = theme;
      try { localStorage.setItem('seal-theme', theme); } catch {}
      apply(theme);
    }
  };
  apply(saved || (system.matches ? 'dark' : 'light'));
  system.addEventListener('change', () => {
    if (!saved) apply(system.matches ? 'dark' : 'light');
  });
})();
