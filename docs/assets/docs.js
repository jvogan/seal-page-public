/* SEAL documentation runtime.
   Injects the shared chrome (top bar, left nav, right TOC, pager, search,
   theme toggle, mobile drawer), highlights code, and wires copy buttons.
   Each page only authors <head> meta and an <article class="docs-article">.
   No build step, no dependencies. */

(() => {
  'use strict';

  const NAV = window.SEAL_DOCS_NAV || [];
  const SITE = '../';            // marketing site root, relative to /docs/
  const GH = 'editions.html#source-tools';

  // Flatten nav for lookups and prev/next.
  const FLAT = [];
  NAV.forEach((g) => g.items.forEach((it) => FLAT.push({ ...it, group: g.group })));

  let currentFile = (() => {
    const path = location.pathname.replace(/\/+$/, '');
    let f = path.substring(path.lastIndexOf('/') + 1);
    if (!f || !f.endsWith('.html')) f = 'index.html';
    return f;
  })();
  let current = FLAT.find((it) => it.file === currentFile) || FLAT[0];
  let currentIdx = FLAT.indexOf(current);

  const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    kids.flat().forEach((c) => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  };

  const svg = (paths, size = 18, extra = {}) => {
    const s = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${extra.sw || 1.7}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    const span = document.createElement('span');
    span.style.display = 'inline-flex';
    span.innerHTML = s;
    return span.firstChild;
  };

  const ICON = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    helix: '<circle cx="12" cy="12" r="9.2" stroke-width="1.4"/><path d="M7 7q5 5 0 10 M17 7q-5 5 0 10" stroke-width="1.4"/><path d="M8.4 9h7.2M8.4 12h7.2M8.4 15h7.2" stroke-width="1" opacity="0.5"/>'
  };
  const icon = (name, size, sw) => svg(ICON[name], size, { sw });

  /* ---- Top bar ----------------------------------------------------------- */

  const searchTrigger = el('button', { class: 'docs-search-trigger', type: 'button', 'aria-label': 'Search docs' },
    icon('search', 16, 1.8),
    el('span', { class: 'docs-search-label' }, 'Search documentation'),
    el('kbd', {}, navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl K')
  );

  const themeBtn = el('button', { class: 'docs-iconbtn', type: 'button', id: 'docs-theme', 'aria-label': 'Toggle theme' });
  themeBtn.appendChild(svg(ICON.sun, 17, { sw: 1.7 }));
  themeBtn.lastChild.classList.add('docs-theme-sun');
  themeBtn.appendChild(svg(ICON.moon, 17, { sw: 1.7 }));
  themeBtn.lastChild.classList.add('docs-theme-moon');

  const menuBtn = el('button', {
    class: 'docs-iconbtn docs-menu-toggle',
    type: 'button',
    'aria-label': 'Open navigation',
    'aria-expanded': 'false',
    'aria-controls': 'docs-sidebar'
  }, icon('menu', 20, 1.8));

  const topbar = el('header', { class: 'docs-topbar' },
    // The wordmark leaves the docs. On mobile the topnav is hidden, so this is
    // the only route back to the site, which is why it points at the site root
    // rather than the docs index. The topnav 'Docs' item covers the docs index.
    el('a', { class: 'docs-brand', href: SITE + 'index.html', 'aria-label': 'SEAL home' },
      el('img', { src: SITE + 'assets/img/favicon-32.png', width: '24', height: '24', alt: '' }),
      el('span', {}, 'SEAL'),
      el('span', { class: 'docs-brand-sub' }, 'Docs')
    ),
    el('nav', { class: 'docs-topnav', 'aria-label': 'Sections' },
      el('a', { href: SITE + 'index.html' }, 'Home'),
      el('a', { href: 'index.html', class: 'is-current' }, 'Docs'),
      el('a', { href: 'cli.html' }, 'CLI'),
      el('a', { href: 'mcp-reference.html' }, 'MCP'),
      el('a', { href: SITE + 'support.html' }, 'Support'),
      el('a', { href: SITE + 'privacy.html' }, 'Privacy'),
      el('a', { href: GH, rel: 'noopener' }, 'Editions')
    ),
    el('span', { class: 'docs-topbar-spacer' }),
    searchTrigger,
    el('a', { class: 'docs-topbtn', href: SITE + 'index.html#install' },
      icon('arrowUp', 15, 2),
      el('span', { class: 'docs-topbtn-label' }, 'Get SEAL')
    ),
    themeBtn,
    menuBtn
  );
  // flip the download arrow to point down
  topbar.querySelector('.docs-topbtn svg').style.transform = 'rotate(180deg)';

  /* ---- Sidebar ----------------------------------------------------------- */

  const sidebar = el('aside', { class: 'docs-sidebar', id: 'docs-sidebar', 'aria-label': 'Documentation navigation' });

  // Below the topnav breakpoint the drawer is the whole navigation, so it has to
  // carry the site links too. Hidden on wide screens, where the topnav shows them.
  sidebar.appendChild(el('div', { class: 'docs-nav-group docs-nav-site' },
    el('span', { class: 'docs-nav-grouptitle' }, 'SEAL'),
    el('ul', {},
      el('li', {}, el('a', { href: SITE + 'index.html' }, 'Home')),
      el('li', {}, el('a', { href: SITE + 'index.html#install' }, 'Get SEAL')),
      el('li', {}, el('a', { href: SITE + 'support.html' }, 'Support')),
      el('li', {}, el('a', { href: SITE + 'privacy.html' }, 'Privacy policy')),
      el('li', {}, el('a', { href: GH, rel: 'noopener' }, 'Editions'))
    )
  ));

  NAV.forEach((g) => {
    const ul = el('ul');
    g.items.forEach((it) => {
      const a = el('a', { href: it.file }, it.title);
      if (it.file === currentFile) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
      ul.appendChild(el('li', {}, a));
    });
    sidebar.appendChild(el('div', { class: 'docs-nav-group' },
      el('span', { class: 'docs-nav-grouptitle' }, g.group),
      ul
    ));
  });

  /* ---- TOC scaffold ------------------------------------------------------ */
  const toc = el('nav', { class: 'docs-toc', 'aria-label': 'On this page' });

  /* ---- Assemble shell ---------------------------------------------------- */
  let article = document.querySelector('.docs-article');
  let isLanding = document.body.classList.contains('docs-landing');
  const main = el('main', { class: 'docs-main' + (isLanding ? ' is-landing' : ''), id: 'docs-main' });
  if (article) main.appendChild(article);

  const shell = el('div', { class: 'docs-shell' }, sidebar, main, toc);
  const scrim = el('div', { class: 'docs-scrim', 'aria-hidden': 'true' });

  document.body.prepend(scrim);
  document.body.prepend(shell);
  document.body.prepend(topbar);
  document.body.prepend(el('a', { class: 'skip-link', href: '#docs-main' }, 'Skip to content'));
  const liveStatus = el('div', {
    class: 'docs-sr-only',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  });
  document.body.appendChild(liveStatus);

  let pageCleanup = [];
  const enhanceStructure = () => {
    toc.replaceChildren();
    toc.style.display = '';
    /* ---- Breadcrumb + copy page (content pages only) ----------------------- */
    if (article && !isLanding && current) {
      const h1 = article.querySelector('h1');
      const crumb = el('div', { class: 'docs-breadcrumb' },
        el('a', { href: 'index.html', style: 'text-decoration:none;color:inherit' }, 'Docs'),
        document.createTextNode(' / '),
        el('span', {}, current.group)
      );
      if (h1) article.insertBefore(crumb, h1);
    }

    /* ---- Heading anchors + TOC -------------------------------------------- */
    const slug = (s) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 64);
    const tocItems = [];
    if (article && !isLanding) {
      const heads = article.querySelectorAll('h2, h3');
      heads.forEach((h) => {
        if (h.closest('a, button')) return;
        if (!h.id) h.id = slug(h.textContent);
        const a = el('a', { class: 'docs-anchor', href: '#' + h.id, 'aria-label': 'Link to this section' }, icon('link', 14, 1.7));
        h.appendChild(a);
        tocItems.push({ id: h.id, text: h.firstChild ? h.textContent.replace('', '') : h.textContent, level: h.tagName === 'H3' ? 3 : 2, h });
      });
    }
    // clean text (strip the anchor glyph) for TOC labels
    if (tocItems.length) {
      toc.appendChild(el('div', { class: 'docs-toc-title' }, 'On this page'));
      const ul = el('ul');
      tocItems.forEach((t) => {
        const label = t.h.childNodes[0] ? t.h.childNodes[0].textContent.trim() : t.text;
        ul.appendChild(el('li', {},
          el('a', { href: '#' + t.id, class: t.level === 3 ? 'toc-h3' : '' }, label)
        ));
      });
      toc.appendChild(ul);
    } else {
      toc.style.display = 'none';
    }

    // scroll-spy
    if (tocItems.length && 'IntersectionObserver' in window) {
      const links = new Map();
      toc.querySelectorAll('a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));
      let activeId = null;
      const setActive = (id) => {
        if (id === activeId) return;
        activeId = id;
        links.forEach((a) => a.classList.remove('is-active'));
        const a = links.get(id);
        if (a) a.classList.add('is-active');
      };
      const visible = new Set();
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        // pick the topmost visible heading
        const ordered = tocItems.map((t) => t.id).filter((id) => visible.has(id));
        if (ordered.length) setActive(ordered[0]);
      }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
      tocItems.forEach((t) => obs.observe(t.h));
      pageCleanup.push(() => obs.disconnect());
    }

    /* ---- Prev / next pager ------------------------------------------------- */
    if (article && !isLanding && currentIdx >= 0) {
      const prev = FLAT[currentIdx - 1];
      const next = FLAT[currentIdx + 1];
      const pager = el('nav', { class: 'docs-pager', 'aria-label': 'Pagination' });
      if (prev) pager.appendChild(el('a', { href: prev.file },
        el('div', { class: 'docs-pager-dir' }, 'Previous'),
        el('div', { class: 'docs-pager-title' }, prev.title)
      ));
      if (next) pager.appendChild(el('a', { href: next.file, class: 'docs-pager-next' },
        el('div', { class: 'docs-pager-dir' }, 'Next'),
        el('div', { class: 'docs-pager-title' }, next.title)
      ));
      if (prev || next) article.appendChild(pager);
      article.appendChild(el('div', { class: 'docs-feedback' },
        el('a', { href: SITE + 'workflows.html' }, 'Workflow gallery'),
        document.createTextNode('  ·  '),
        el('a', { href: 'troubleshooting.html' }, 'Troubleshooting')
      ));
    }

  };

  /* ---- Theme ------------------------------------------------------------- */
  const root = document.documentElement;
  const syncTheme = () => {
    const dark = root.dataset.theme === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeBtn.setAttribute('aria-pressed', String(dark));
  };
  syncTheme();
  window.addEventListener('seal-theme-change', syncTheme);
  themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    window.SEAL_THEME.set(next);
    themeBtn.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  });

  /* ---- Mobile drawer ----------------------------------------------------- */
  let drawerReturnFocus = null;
  const drawerMedia = window.matchMedia('(max-width: 860px)');
  const topbarDrawerPeers = [...topbar.children].filter((node) => node !== menuBtn);
  const showActiveNav = () => {
    const active = sidebar.querySelector('[aria-current="page"]');
    if (!active || sidebar.inert) return;
    const bounds = sidebar.getBoundingClientRect();
    const link = active.getBoundingClientRect();
    if (link.top < bounds.top + 12) sidebar.scrollTop += link.top - bounds.top - 12;
    else if (link.bottom > bounds.bottom - 12) sidebar.scrollTop += link.bottom - bounds.bottom + 12;
  };
  const syncDrawerAccessibility = () => {
    const mobile = drawerMedia.matches;
    const open = mobile && sidebar.classList.contains('is-open');
    sidebar.inert = mobile && !open;
    if (mobile) sidebar.setAttribute('aria-hidden', open ? 'false' : 'true');
    else sidebar.removeAttribute('aria-hidden');

    // A viewport can widen while the drawer is open. Restore the desktop shell
    // without returning focus to a menu button that is no longer displayed.
    if (!mobile && sidebar.classList.contains('is-open')) {
      sidebar.classList.remove('is-open');
      scrim.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Open navigation');
      main.inert = false;
      toc.inert = false;
      topbarDrawerPeers.forEach((node) => { node.inert = false; });
      document.body.style.overflow = '';
      drawerReturnFocus = null;
    }
  };
  const setDrawer = (open) => {
    if (open) drawerReturnFocus = document.activeElement;
    sidebar.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    main.inert = open;
    toc.inert = open;
    topbarDrawerPeers.forEach((node) => { node.inert = open; });
    document.body.style.overflow = open ? 'hidden' : '';
    syncDrawerAccessibility();
    if (open) {
      requestAnimationFrame(() => {
        if (!sidebar.classList.contains('is-open')) return;
        showActiveNav();
        (sidebar.querySelector('[aria-current="page"]') || sidebar.querySelector('a'))?.focus({ preventScroll: true });
      });
    } else if (drawerReturnFocus instanceof HTMLElement) {
      drawerReturnFocus.focus();
      drawerReturnFocus = null;
    }
  };
  syncDrawerAccessibility();
  showActiveNav();
  drawerMedia.addEventListener('change', () => {
    syncDrawerAccessibility();
    showActiveNav();
  });
  menuBtn.addEventListener('click', () => setDrawer(!sidebar.classList.contains('is-open')));
  scrim.addEventListener('click', () => setDrawer(false));
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a') && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) setDrawer(false);
  });
  document.addEventListener('keydown', (e) => {
    if (!sidebar.classList.contains('is-open') || e.key !== 'Tab') return;
    const focusable = [menuBtn, ...sidebar.querySelectorAll('a[href], button:not([disabled])')]
      .filter((node) => !node.hidden && node.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---- Syntax highlight -------------------------------------------------- */
  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const GRAMMAR = {
    js: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(\d[\d_.eExXa-fA-F]*)\b|\b(const|let|var|function|return|await|async|import|from|export|default|new|if|else|for|of|in|while|class|extends|try|catch|throw|true|false|null|undefined|this|typeof|void)\b/g,
    json: /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\b\d[\d.eE+-]*\b)/g,
    bash: /(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|(\$\{?[\w]+\}?)|(^|\s)(--?[A-Za-z][\w-]*)|\b(\d[\d.]+)\b/gm,
    python: /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(\d[\d_.eExX]*)\b|\b(def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|with|try|except|finally|raise|True|False|None|lambda|yield|pass|self)\b/g
  };
  GRAMMAR.ts = GRAMMAR.js;
  GRAMMAR.javascript = GRAMMAR.js;
  GRAMMAR.typescript = GRAMMAR.js;
  GRAMMAR.sh = GRAMMAR.bash;
  GRAMMAR.shell = GRAMMAR.bash;
  GRAMMAR.console = GRAMMAR.bash;
  GRAMMAR.py = GRAMMAR.python;

  const highlight = (raw, lang) => {
    let code = escapeHtml(raw);
    const g = GRAMMAR[lang];
    if (g) {
      if (lang === 'json') {
        code = code.replace(g, (m, str, colon, kw, num) => {
          if (str != null) return colon ? `<span class="tok-prop">${str}</span>${colon}` : `<span class="tok-string">${str}</span>`;
          if (kw) return `<span class="tok-keyword">${kw}</span>`;
          if (num) return `<span class="tok-number">${num}</span>`;
          return m;
        });
      } else if (GRAMMAR.bash === g) {
        code = code.replace(g, (m, comment, str, vari, lead, flag, num) => {
          if (comment) return `<span class="tok-comment">${comment}</span>`;
          if (str) return `<span class="tok-string">${str}</span>`;
          if (vari) return `<span class="tok-prop">${vari}</span>`;
          if (flag) return `${lead || ''}<span class="tok-flag">${flag}</span>`;
          if (num) return `<span class="tok-number">${num}</span>`;
          return m;
        });
      } else {
        code = code.replace(g, (m, comment, str, num, kw) => {
          if (comment) return `<span class="tok-comment">${comment}</span>`;
          if (str) return `<span class="tok-string">${str}</span>`;
          if (num) return `<span class="tok-number">${num}</span>`;
          if (kw) return `<span class="tok-keyword">${kw}</span>`;
          return m;
        });
      }
    }
    // color a leading shell prompt
    code = code.replace(/(^|\n)(\$ )/g, (m, nl) => `${nl}<span class="tok-prompt">$ </span>`);
    return code;
  };

  const enhanceContent = () => {
    /* ---- Code block enhancement ------------------------------------------- */
    // Author markup: <div class="docs-code" data-lang="bash" data-title="Run a digest"><pre><code>...</code></pre></div>
    article.querySelectorAll('.docs-code').forEach((block) => {
      const pre = block.querySelector('pre');
      const codeEl = block.querySelector('code') || pre;
      if (!pre || !codeEl) return;
      const lang = (block.dataset.lang || '').toLowerCase();
      const title = block.dataset.title;

      const raw = codeEl.textContent.replace(/\n$/, '');
      codeEl.innerHTML = highlight(raw, lang);

      const copyBtn = el('button', { class: 'docs-code-copy', type: 'button', 'aria-label': 'Copy code' }, icon('copy', 14, 1.7), el('span', {}, 'Copy'));
      let timer = 0;
      pageCleanup.push(() => clearTimeout(timer));
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(raw);
          if (!copyBtn.isConnected) return;
          copyBtn.classList.add('is-copied');
          copyBtn.lastChild.textContent = 'Copied';
          liveStatus.textContent = 'Code copied to clipboard';
          clearTimeout(timer);
          timer = setTimeout(() => { copyBtn.classList.remove('is-copied'); copyBtn.lastChild.textContent = 'Copy'; }, 1400);
        } catch (e) {
          if (!copyBtn.isConnected) return;
          liveStatus.textContent = 'Could not copy code';
        }
      });

      if (title || lang) {
        const head = el('div', { class: 'docs-code-head' },
          el('span', { class: 'docs-code-title' }, title || ''),
          lang ? el('span', { class: 'docs-code-lang' }, lang) : '',
          copyBtn
        );
        block.insertBefore(head, block.firstChild);
      } else {
        copyBtn.classList.add('docs-code-copy-float');
        block.appendChild(copyBtn);
      }
    });

    /* ---- Diagrams: make each SVG horizontally scrollable on narrow screens -- */
    article.querySelectorAll('.docs-figure > svg').forEach((s) => {
      const wrap = el('div', { class: 'docs-figure-scroll' });
      s.parentNode.insertBefore(wrap, s);
      wrap.appendChild(s);
    });
    /* On narrow screens a diagram is kept full-size and scrolls. A center-composed
       figure (content inset from the left, e.g. the vertical workspace hierarchy)
       would otherwise pin to an empty left margin with its nodes clipped off-screen,
       so bring its content into view. Left-anchored flow diagrams keep scrollLeft 0
       so their first node stays visible. No-op when the figure fits (desktop). */
    const frame = requestAnimationFrame(() => {
      article.querySelectorAll('.docs-figure-scroll').forEach((wrap) => {
        const extra = wrap.scrollWidth - wrap.clientWidth;
        if (extra <= 1) return;
        const svg = wrap.querySelector('svg');
        let target = 0;
        try {
          const vb = svg.viewBox.baseVal;
          const bb = svg.getBBox();
          if ((bb.x - vb.x) / vb.width > 0.12) {
            const scale = wrap.scrollWidth / vb.width;
            target = (bb.x - vb.x + bb.width / 2) * scale - wrap.clientWidth / 2;
          }
        } catch (e) { /* getBBox unavailable: leave at start */ }
        wrap.scrollLeft = Math.max(0, Math.min(extra, target));
      });
    });

    pageCleanup.push(() => cancelAnimationFrame(frame));
  };

  /* ---- Back to top ------------------------------------------------------- */
  const toTop = el('button', { class: 'docs-totop', type: 'button', 'aria-label': 'Back to top', hidden: '' }, icon('arrowUp', 16, 2));
  document.body.appendChild(toTop);
  const focusArticleStart = () => {
    const target = article?.querySelector('h1') || main;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  const syncToTop = () => {
    const visible = window.scrollY > 700;
    if (!visible && document.activeElement === toTop) focusArticleStart();
    toTop.hidden = !visible;
    toTop.classList.toggle('is-visible', visible);
  };
  toTop.addEventListener('click', () => {
    focusArticleStart();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  syncToTop();
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { syncToTop(); ticking = false; });
  }, { passive: true });

  /* ---- Search ------------------------------------------------------------ */
  // Index: prefer a prebuilt assets/search-index.json (title, group, file,
  // headings, body). Fall back to nav titles + descriptions.
  let INDEX = FLAT.map((it) => ({ title: it.title, group: it.group, file: it.file, text: it.desc || '', headings: [] }));
  fetch('assets/search-index.json').then((r) => r.ok ? r.json() : null).then((data) => { if (Array.isArray(data) && data.length) INDEX = data; }).catch(() => {});

  const dialog = el('div', {
    class: 'docs-search-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Search',
    'aria-hidden': 'true'
  });
  dialog.inert = true;
  const input = el('input', { class: 'docs-search-input', type: 'text', id: 'docs-search-input', name: 'docs-search', placeholder: 'Search documentation', 'aria-label': 'Search documentation', autocomplete: 'off', spellcheck: 'false' });
  const results = el('div', { class: 'docs-search-results', 'data-empty': 'Type to search the documentation' });
  const searchStatus = el('div', { class: 'docs-sr-only', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const searchClose = el('button', { class: 'docs-search-close', type: 'button', 'aria-label': 'Close search' }, 'Close');
  const box = el('div', { class: 'docs-search-box' },
    el('div', { class: 'docs-search-inputrow' }, icon('search', 18, 1.8), input, searchClose),
    searchStatus,
    results,
    el('div', { class: 'docs-search-foot' },
      el('span', {}, el('kbd', {}, '↑'), el('kbd', {}, '↓'), document.createTextNode(' to navigate')),
      el('span', {}, el('kbd', {}, '↵'), document.createTextNode(' to open')),
      el('span', {}, el('kbd', {}, 'esc'), document.createTextNode(' to close'))
    )
  );
  dialog.appendChild(box);
  document.body.appendChild(dialog);

  let selIdx = 0;
  let hits = [];
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mark = (text, q) => {
    if (!q) return escapeHtml(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return escapeHtml(text);
    const start = Math.max(0, i - 32);
    const slice = (start > 0 ? '…' : '') + text.slice(start, i + q.length + 60);
    return escapeHtml(slice).replace(new RegExp(escRe(q), 'ig'), (m) => `<mark>${m}</mark>`);
  };
  const search = (q) => {
    q = q.trim();
    if (!q) { hits = []; render(); return; }
    const ql = q.toLowerCase();
    hits = INDEX.map((d) => {
      const hayTitle = d.title.toLowerCase();
      const hayBody = (d.text || '').toLowerCase();
      const heads = (d.headings || []).join(' · ');
      let score = 0;
      if (hayTitle === ql) score += 100;
      if (hayTitle.includes(ql)) score += 40;
      if (heads.toLowerCase().includes(ql)) score += 18;
      if (hayBody.includes(ql)) score += 8;
      // token overlap
      ql.split(/\s+/).forEach((t) => { if (t && (hayTitle.includes(t) || hayBody.includes(t))) score += 2; });
      return { d, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8).map((x) => x.d);
    selIdx = 0;
    render(q);
  };
  const render = (q) => {
    results.innerHTML = '';
    results.dataset.empty = q ? 'No results. Try a different search.' : 'Type to search the documentation';
    results.scrollTop = 0;
    hits.forEach((d, i) => {
      const snippetSource = (d.headings && d.headings.length ? d.headings.join(' · ') : '') || d.text || '';
      const hit = el('a', { class: 'docs-search-hit' + (i === selIdx ? ' is-selected' : ''), href: d.file },
        el('div', { class: 'docs-search-hit-group' }, d.group),
        el('div', { class: 'docs-search-hit-title', html: mark(d.title, q) }),
        snippetSource ? el('div', { class: 'docs-search-hit-snip', html: mark(snippetSource, q) }) : ''
      );
      hit.addEventListener('mouseenter', () => { selIdx = i; updateSel(); });
      results.appendChild(hit);
    });
    searchStatus.textContent = q
      ? (hits.length ? `${hits[selIdx].title}, result ${selIdx + 1} of ${hits.length}` : '0 search results')
      : 'Type to search the documentation';
  };
  const updateSel = (scroll = false) => {
    results.querySelectorAll('.docs-search-hit').forEach((h, i) => h.classList.toggle('is-selected', i === selIdx));
    if (hits[selIdx]) searchStatus.textContent = `${hits[selIdx].title}, result ${selIdx + 1} of ${hits.length}`;
    if (scroll) results.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  };
  let searchReturnFocus = null;
  const openSearch = () => {
    if (document.querySelector('dialog[open]')) return;
    if (sidebar.classList.contains('is-open')) setDrawer(false);
    searchReturnFocus = document.activeElement;
    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
    dialog.inert = false;
    topbar.inert = true;
    shell.inert = true;
    document.body.style.overflow = 'hidden';
    input.value = '';
    hits = [];
    render();
    input.focus();
  };
  const closeSearch = () => {
    dialog.classList.remove('is-open');
    dialog.setAttribute('aria-hidden', 'true');
    dialog.inert = true;
    topbar.inert = false;
    shell.inert = false;
    document.body.style.overflow = '';
    if (searchReturnFocus instanceof HTMLElement) searchReturnFocus.focus();
    searchReturnFocus = null;
  };
  searchTrigger.addEventListener('click', openSearch);
  searchClose.addEventListener('click', closeSearch);
  input.addEventListener('input', () => search(input.value));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeSearch(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); selIdx = Math.max(0, Math.min(selIdx + 1, hits.length - 1)); updateSel(true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selIdx = Math.max(selIdx - 1, 0); updateSel(true); }
    else if (e.key === 'Enter') {
      const hit = results.querySelectorAll('a')[selIdx];
      if (hit) { e.preventDefault(); hit.click(); }
    }
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('input, a[href], button:not([disabled])')]
      .filter((node) => !node.hidden && node.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dialog.classList.contains('is-open') ? closeSearch() : openSearch(); }
    else if (e.key === 'Escape') { if (dialog.classList.contains('is-open')) closeSearch(); else if (sidebar.classList.contains('is-open')) setDrawer(false); }
    else if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName) && !dialog.classList.contains('is-open')) { e.preventDefault(); openSearch(); }
  });

  /* ---- Article navigation ----------------------------------------------- */
  const enhancePage = () => {
    enhanceStructure();
    enhanceContent();
  };
  enhancePage();

  // File previews and unknown destinations keep the browser's normal navigation.
  if (!article || !/^https?:$/.test(location.protocol)) return;
  const docsBase = new URL('./', location.href);
  const knownPaths = new Set(FLAT.map((item) => new URL(item.file, docsBase).pathname));
  knownPaths.add(docsBase.pathname);
  const knownURL = (value) => {
    const url = new URL(value, location.href);
    return url.origin === location.origin && knownPaths.has(url.pathname) ? url : null;
  };
  const pageKey = (url) => url.pathname + url.search;
  let renderedURL = new URL(location.href);
  let navigation = null;
  const pages = new Map();
  const dependencies = new Map();
  // The authored deferred runtimes finish before we decide which ones to add.
  const ready = new Promise((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('DOMContentLoaded', resolve, { once: true });
  });

  const newEntryID = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const positions = new Map();
  const initialPosition = history.state?.sealDocs;
  let entryID = initialPosition?.id || newEntryID();
  const savePosition = (persist = false) => {
    if (location.href !== renderedURL.href) return;
    const position = { id: entryID, url: location.href, x: window.scrollX, y: window.scrollY };
    positions.set(entryID, position);
    if (persist) history.replaceState({ ...history.state, sealDocs: position }, '', location.href);
  };
  history.scrollRestoration = 'manual';
  savePosition(true);
  // Scrolling only updates memory; history writes happen at navigation boundaries.
  window.addEventListener('scroll', () => savePosition(), { passive: true });
  window.addEventListener('pagehide', () => savePosition(true));

  const placeArticle = (url, position, focus = true) => {
    let target = null;
    if (url.hash) {
      try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); }
      catch (_) { /* A malformed fragment still opens the page. */ }
    }
    if (focus) {
      const focusTarget = target || article.querySelector('h1') || main;
      focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({ preventScroll: true });
    }
    if (position?.url === url.href) {
      window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    } else if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    syncToTop();
    savePosition(true);
  };

  const loadDependency = (source, tag, attribute, destination) => {
    const href = new URL(source.getAttribute(attribute), destination).href;
    if (dependencies.has(href)) return dependencies.get(href);
    const existing = [...document.querySelectorAll(`${tag}[${attribute}]`)]
      .some((node) => node[attribute] === href);
    if (existing) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const node = document.createElement(tag);
      if (tag === 'link') node.rel = 'stylesheet';
      else node.async = false;
      node[attribute] = href;
      node.onload = resolve;
      node.onerror = () => {
        node.remove();
        dependencies.delete(href);
        reject(new Error('Could not load documentation asset'));
      };
      document.head.appendChild(node);
    });
    dependencies.set(href, promise);
    return promise;
  };
  const loadDependencies = async (page, destination) => {
    await ready;
    await Promise.all([...page.querySelectorAll('link[rel="stylesheet"]')]
      .map((node) => loadDependency(node, 'link', 'href', destination)));
    // Do not run arbitrary scripts from fetched markup or rebuild the shell.
    const runtimePaths = new Set(['../assets/images.js', '../assets/tutorials.js']
      .map((path) => new URL(path, docsBase).pathname));
    const shellPaths = new Set(['assets/nav.js', 'assets/docs.js', '../assets/theme.js']
      .map((path) => new URL(path, docsBase).pathname));
    for (const node of page.querySelectorAll('script[src]')) {
      const url = new URL(node.getAttribute('src'), destination);
      if (url.origin !== location.origin) throw new Error('Unknown documentation runtime');
      if (runtimePaths.has(url.pathname)) await loadDependency(node, 'script', 'src', destination);
      else if (!shellPaths.has(url.pathname)) throw new Error('Unknown documentation runtime');
    }
  };
  const updateMetadata = (page) => {
    document.title = page.title;
    const selector = 'meta[name="description"], meta[name="author"], meta[name="robots"], ' +
      'meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[type="application/ld+json"]';
    document.head.querySelectorAll(selector).forEach((node) => node.remove());
    page.head.querySelectorAll(selector).forEach((node) => document.head.appendChild(document.importNode(node, true)));
  };
  const closeOverlays = () => {
    if (dialog.classList.contains('is-open')) closeSearch();
    if (sidebar.classList.contains('is-open')) setDrawer(false);
    window.SEAL_IMAGES?.close?.();
  };
  const navigate = async (url, { pop = false, position = null } = {}) => {
    navigation?.abort();
    const controller = new AbortController();
    navigation = controller;
    closeOverlays();
    const commitURL = () => {
      if (!pop && location.href !== url.href) {
        savePosition(true);
        entryID = newEntryID();
        history.pushState({ sealDocs: { id: entryID } }, '', url.href);
      }
      if (pop) entryID = position?.id || newEntryID();
      renderedURL = url;
    };
    if (pageKey(url) === pageKey(renderedURL)) {
      commitURL();
      placeArticle(url, position);
      return;
    }
    try {
      const key = pageKey(url);
      let html = pages.get(key);
      if (!html) {
        const response = await fetch(url.href, { signal: controller.signal });
        if (!response.ok || !response.headers.get('content-type')?.includes('text/html') ||
            new URL(response.url).origin !== location.origin || pageKey(new URL(response.url)) !== key) throw new Error('Not a documentation page');
        html = await response.text();
      }
      if (controller.signal.aborted) return;
      const page = new DOMParser().parseFromString(html, 'text/html');
      const nextArticle = page.querySelector('.docs-article');
      if (!nextArticle || page.querySelector('base') || nextArticle.querySelector('script')) {
        throw new Error('Not a static documentation article');
      }
      await loadDependencies(page, url);
      if (controller.signal.aborted) return;
      pages.delete(key);
      pages.set(key, html);
      if (pages.size > 6) pages.delete(pages.keys().next().value);
      // This synchronous swap has no empty or loading state between articles.
      window.dispatchEvent(new CustomEvent('seal-docs-before-page-change'));
      pageCleanup.forEach((cleanup) => cleanup());
      pageCleanup = [];
      commitURL();
      article.replaceWith(document.importNode(nextArticle, true));
      article = main.querySelector('.docs-article');
      isLanding = page.body.classList.contains('docs-landing');
      document.body.classList.toggle('docs-landing', isLanding);
      main.classList.toggle('is-landing', isLanding);
      currentFile = url.pathname.split('/').pop() || 'index.html';
      current = FLAT.find((item) => item.file === currentFile);
      currentIdx = FLAT.indexOf(current);
      sidebar.querySelectorAll('a').forEach((link) => {
        const active = link.getAttribute('href') === currentFile;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      showActiveNav();
      updateMetadata(page);
      enhancePage();
      window.dispatchEvent(new CustomEvent('seal-docs-page-change', { detail: { article } }));
      placeArticle(url, position);
    } catch (error) {
      if (controller.signal.aborted) return;
      // A static link remains useful if fetch, parsing, or enhancement fails.
      if (pop) location.replace(url.href);
      else location.assign(url.href);
    }
  };
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || link.relList.contains('external')) return;
    const url = knownURL(link.href);
    if (!url) return;
    event.preventDefault();
    navigate(url);
  });
  window.addEventListener('popstate', (event) => {
    const url = knownURL(location.href);
    if (url) navigate(url, { pop: true, position: positions.get(event.state?.sealDocs?.id) || event.state?.sealDocs });
    else location.reload();
  });
  // Direct section URLs may refer to IDs generated by the heading enhancer.
  ready.then(() => {
    if (navigation) return;
    if (initialPosition?.url === location.href || location.hash) {
      placeArticle(new URL(location.href), initialPosition, false);
    }
  });
})();
