(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---- Theme toggle ----
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const syncThemeToggle = () => {
    if (!toggle) return;
    const isDark = root.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    toggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  };
  syncThemeToggle();
  window.addEventListener('seal-theme-change', syncThemeToggle);
  toggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    window.SEAL_THEME.set(next);
    syncThemeToggle();
  });

  // ---- Mobile nav (hamburger) ----
  // Focus management: move focus into the sheet on open, make the rest of the
  // document inert so a Tab cannot land outside, return focus to burger on
  // close. Inert avoids the well-known SR ghost-focus bug aria-hidden has.
  const burger = document.getElementById('nav-burger');
  const sheet = document.getElementById('nav-mobile-sheet');
  if (burger && sheet) {
    const inertBeforeOpen = new Map();
    let previousOverflow = '';
    const setBackgroundInert = (on) => {
      if (on) {
        document.querySelectorAll('#main, footer, .skip-link, .nav-brand, .nav-links, .nav-actions > :not(#nav-burger), .back-to-top').forEach((node) => {
          inertBeforeOpen.set(node, node.inert);
          node.inert = true;
        });
      } else {
        inertBeforeOpen.forEach((inert, node) => { node.inert = inert; });
        inertBeforeOpen.clear();
      }
    };
    const closeSheet = (restoreFocus = true) => {
      if (!sheet.classList.contains('is-open')) return;
      sheet.classList.remove('is-open');
      sheet.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      setBackgroundInert(false);
      document.body.style.overflow = previousOverflow;
      if (restoreFocus) {
        const target = burger.getClientRects().length ? burger : document.querySelector('.nav-brand');
        target?.focus({ preventScroll: true });
      }
    };
    const openSheet = () => {
      sheet.hidden = false;
      sheet.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
      setBackgroundInert(true);
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      sheet.scrollTop = 0;
      // Move focus into the first focusable element in the sheet
      const firstLink = sheet.querySelector('a, button');
      firstLink?.focus({ preventScroll: true });
    };
    burger.addEventListener('click', () => {
      sheet.classList.contains('is-open') ? closeSheet() : openSheet();
    });
    sheet.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      closeSheet();
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && url.hash) {
        let target;
        try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); }
        catch (_) { return; }
        if (target) requestAnimationFrame(() => {
          const heading = target.querySelector('h1, h2') || target;
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        });
      }
    });
    window.matchMedia('(min-width: 841px)').addEventListener('change', (e) => {
      if (e.matches) closeSheet();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.classList.contains('is-open')) {
        e.preventDefault();
        closeSheet();
      } else if (e.key === 'Tab' && sheet.classList.contains('is-open')) {
        const controls = [burger, ...sheet.querySelectorAll('a[href], button:not([disabled])')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    document.addEventListener('click', (e) => {
      if (!sheet.classList.contains('is-open')) return;
      if (sheet.contains(e.target) || burger.contains(e.target)) return;
      closeSheet();
    });
    window.addEventListener('pagehide', () => closeSheet(false));
  }

  // ---- Nav scroll state ----
  const nav = document.querySelector('.nav');
  if (nav) {
    let ticking = false;
    const updateNav = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    };
    updateNav();
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNav);
        ticking = true;
      }
    }, { passive: true });
  }

  // ---- Feature-tour tabs ----
  // Roving tabindex per WAI-ARIA Authoring Practices: only the selected tab
  // is in the tab sequence; arrow keys + Home/End move focus and selection.
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));

  const syncTabIndices = () => {
    tabs.forEach((t) => {
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    });
  };
  syncTabIndices();

  const showPanel = (panelId) => {
    panels.forEach((panel) => {
      const active = panel.id === panelId;
      panel.hidden = !active;
      const video = panel.querySelector('video');
      if (video) {
        if (active) {
          if (!video.src && video.dataset.clip) {
            video.src = video.dataset.clip;
          }
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  };

  let tabSelection = 0;
  const selectTab = async (tab, focus = false) => {
    const selection = ++tabSelection;
    const panelId = tab.getAttribute('aria-controls');
    const targetPanel = document.getElementById(panelId);
    if (!targetPanel) return;
    if (focus) {
      tab.focus({ preventScroll: true });
      const strip = tab.closest('.tabs');
      const bounds = strip.getBoundingClientRect();
      const selected = tab.getBoundingClientRect();
      if (selected.left < bounds.left) strip.scrollLeft += selected.left - bounds.left;
      else if (selected.right > bounds.right) strip.scrollLeft += selected.right - bounds.right;
    }
    // Keep the current panel visible until the chosen screenshots can be drawn.
    await Promise.allSettled([...targetPanel.querySelectorAll('img')].map((img) => {
      img.loading = 'eager';
      return img.decode();
    }));
    if (selection !== tabSelection) return;
    tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
    tab.setAttribute('aria-selected', 'true');
    syncTabIndices();
    const video = targetPanel?.querySelector('video');
    if (video) {
      video.dataset.clip = tab.dataset.clip || '';
      if (video.dataset.lastClip !== video.dataset.clip) {
        video.removeAttribute('src');
        video.load();
        video.dataset.lastClip = video.dataset.clip;
      }
    }
    showPanel(panelId);
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        selectTab(tabs[(i + 1) % tabs.length], true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        selectTab(tabs[0], true);
      } else if (e.key === 'End') {
        e.preventDefault();
        selectTab(tabs[tabs.length - 1], true);
      }
    });
  });

  // Initialise the first tab's video src AND start playing it
  const firstTab = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
  if (firstTab) {
    const panelId = firstTab.getAttribute('aria-controls');
    const targetPanel = document.getElementById(panelId);
    const video = targetPanel?.querySelector('video');
    if (video && firstTab.dataset.clip) {
      video.src = firstTab.dataset.clip;
      video.dataset.lastClip = firstTab.dataset.clip;
      video.play().catch(() => {});
    }
  }

  // ---- Back-to-top button ----
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.hidden = true;
  backToTop.type = 'button';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.title = 'Back to top';
  const arrow = document.createElementNS(SVG_NS, 'svg');
  arrow.setAttribute('viewBox', '0 0 24 24');
  arrow.setAttribute('width', '16');
  arrow.setAttribute('height', '16');
  arrow.setAttribute('fill', 'none');
  arrow.setAttribute('stroke', 'currentColor');
  arrow.setAttribute('stroke-width', '2');
  arrow.setAttribute('stroke-linecap', 'round');
  arrow.setAttribute('stroke-linejoin', 'round');
  const arrowPath = document.createElementNS(SVG_NS, 'path');
  arrowPath.setAttribute('d', 'M12 19V5M5 12l7-7 7 7');
  arrow.appendChild(arrowPath);
  backToTop.appendChild(arrow);
  document.body.appendChild(backToTop);
  const focusPageStart = () => {
    const target = document.querySelector('main h1') || document.getElementById('main');
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  backToTop.addEventListener('click', () => {
    focusPageStart();
    window.scrollTo({ top: 0, behavior: 'instant' });
    updateBackToTop();
  });
  let backToTopTicking = false;
  const updateBackToTop = () => {
    const visible = window.scrollY > 800;
    if (!visible && document.activeElement === backToTop) focusPageStart();
    backToTop.hidden = !visible;
    backToTop.classList.toggle('is-visible', visible);
    backToTopTicking = false;
  };
  updateBackToTop();
  window.addEventListener('scroll', () => {
    if (!backToTopTicking) {
      window.requestAnimationFrame(updateBackToTop);
      backToTopTicking = true;
    }
  }, { passive: true });

  // ---- Real copy buttons inside code blocks ----
  // Replaces the previous role="button" on the <pre> itself, which made screen
  // readers announce the entire block as one giant button label.
  const copyStatus = document.createElement('span');
  copyStatus.className = 'code-copy-status';
  copyStatus.setAttribute('role', 'status');
  document.body.appendChild(copyStatus);
  document.querySelectorAll('.code-block').forEach((block, idx) => {
    if (block.querySelector('.code-copy')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.textContent = 'Copy';
    block.appendChild(btn);
    let resetTimer = 0;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const codeEl = block.querySelector('code') || block;
      const text = codeEl.innerText.replace(/\bCopy\b\s*$/, '').replace(/\bCopied\b\s*$/, '').trim();
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
        copyStatus.textContent = 'Copied to clipboard';
        block.classList.add('is-copied');
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          btn.textContent = 'Copy';
          block.classList.remove('is-copied');
        }, 1400);
      } catch {
        btn.textContent = 'Select to copy';
        copyStatus.textContent = 'Could not copy. Select the text and copy it manually.';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(codeEl);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  });
})();
