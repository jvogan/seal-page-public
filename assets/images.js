(() => {
  if (window.SEAL_IMAGES) { window.SEAL_IMAGES.refresh(); return; }
  const prepared = new WeakSet();
  const syncImages = () => {
    document.querySelectorAll('img[data-light-src][data-dark-src]').forEach((img) => {
      const source = document.documentElement.dataset.theme === 'dark' ? img.dataset.darkSrc : img.dataset.lightSrc;
      if (img.getAttribute('src') !== source) img.src = source;
      const link = img.closest('.screenshot-link');
      if (link) link.href = img.src;
    });
  };
  syncImages();
  window.addEventListener('seal-theme-change', syncImages);
  if (!('HTMLDialogElement' in window)) {
    window.SEAL_IMAGES = { refresh: syncImages };
    window.addEventListener('seal-docs-page-change', syncImages);
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'image-viewer';
  dialog.setAttribute('aria-labelledby', 'image-viewer-title');
  dialog.innerHTML = '<div class="image-viewer-header"><h2 class="image-viewer-title" id="image-viewer-title">Screenshot</h2><a class="image-viewer-original" target="_blank" rel="noopener">Open image</a><button type="button" class="image-viewer-zoom" aria-pressed="false">Zoom in</button><button type="button" class="image-viewer-close" autofocus>Close</button></div><div class="image-viewer-stage"><img alt="" /></div><p class="image-viewer-caption"></p>';
  document.body.appendChild(dialog);
  const stage = dialog.querySelector('.image-viewer-stage');
  stage.tabIndex = 0;
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-label', 'Screenshot image; use arrow keys to scroll when zoomed');
  const fullImage = stage.querySelector('img');
  const caption = dialog.querySelector('.image-viewer-caption');
  const original = dialog.querySelector('.image-viewer-original');
  const zoom = dialog.querySelector('.image-viewer-zoom');
  let returnFocus;
  let previousOverflow;

  const open = (img, anchor) => {
    returnFocus = anchor;
    previousOverflow = document.body.style.overflow;
    fullImage.src = img.currentSrc || img.src;
    fullImage.alt = img.alt;
    original.href = fullImage.src;
    caption.textContent = img.closest('figure')?.querySelector('figcaption')?.textContent.trim() || img.alt || 'SEAL workflow screenshot';
    stage.classList.remove('is-zoomed');
    zoom.textContent = 'Zoom in';
    zoom.setAttribute('aria-pressed', 'false');
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    stage.scrollTo(0, 0);
  };
  const refresh = () => {
    syncImages();
    document.querySelectorAll('main figure img, .docs-shot-frame img').forEach((img) => {
      if (prepared.has(img) || img.closest('[data-no-zoom]')) return;
      let anchor = img.closest('a');
      if (anchor && !/\.(png|jpe?g|webp)(?:[?#]|$)/i.test(anchor.href)) return;
      if (!anchor) {
        anchor = document.createElement('a');
        anchor.href = img.src;
        img.replaceWith(anchor);
        anchor.appendChild(img);
      }
      anchor.classList.add('screenshot-link');
      const description = img.alt || img.closest('figure')?.querySelector('figcaption')?.textContent.trim() || 'SEAL workflow';
      anchor.setAttribute('aria-label', `View screenshot: ${description}`);
      prepared.add(img);
      anchor.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        open(img, anchor);
      });
    });
  };
  zoom.addEventListener('click', () => {
    const isZoomed = stage.classList.toggle('is-zoomed');
    zoom.textContent = isZoomed ? 'Fit to screen' : 'Zoom in';
    zoom.setAttribute('aria-pressed', String(isZoomed));
    if (isZoomed) stage.focus({ preventScroll: true });
  });
  dialog.querySelector('.image-viewer-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    fullImage.removeAttribute('src');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  });
  const closeForNavigation = () => {
    returnFocus = null;
    if (!dialog.open) return;
    dialog.close();
    document.body.style.overflow = previousOverflow;
  };
  window.SEAL_IMAGES = { refresh, close: closeForNavigation };
  window.addEventListener('seal-docs-page-change', refresh);
  window.addEventListener('seal-docs-before-page-change', closeForNavigation);
  refresh();
})();
