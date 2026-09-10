#!/usr/bin/env node
/* Build docs/assets/search-index.json from nav.js + the page HTML files.
   Run from anywhere:  node docs/assets/build-search-index.mjs
   Deployed site stays static; this is a one-time generator you re-run when
   docs content changes. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const here = path.dirname(scriptPath);                       // docs/assets
const docsDir = path.resolve(here, '..');                    // docs

// Parse nav.js into a flat page list without evaluating it. The file shape is
// stable (group/items literals authored in this repo), so a scoped regex over
// group headers and item literals is enough, and avoids running the file.
const navSrc = fs.readFileSync(path.join(here, 'nav.js'), 'utf8');
const NAV = (() => {
  const groups = [];
  let current = null;
  const re = /group:\s*'([^']+)'|title:\s*'([^']+)',\s*file:\s*'([^']+)',\s*desc:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(navSrc)) !== null) {
    if (m[1] !== undefined) {
      current = { group: m[1], items: [] };
      groups.push(current);
    } else if (current) {
      current.items.push({ title: m[2], file: m[3], desc: m[4].replace(/\\'/g, "'") });
    }
  }
  return groups;
})();

const strip = (html) => html
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&[a-z]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const matchAll = (re, s) => [...s.matchAll(re)].map((m) => strip(m[1]));

export const extractSearchText = (article) => {
  const ledeMatch = article.match(
    /<p\b[^>]*\bclass=(["'])[^"']*\bdocs-lede\b[^"']*\1[^>]*>([\s\S]*?)<\/p>/i
  );
  const articleWithoutLede = ledeMatch
    ? article.replace(ledeMatch[0], ' ')
    : article;
  const paras = matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi, articleWithoutLede);
  return [ledeMatch ? strip(ledeMatch[2]) : '', ...paras]
    .filter(Boolean)
    .join(' ');
};

export const buildSearchIndex = () => {
  const index = [];
  for (const group of NAV) {
    for (const item of group.items) {
      const file = path.join(docsDir, item.file);
      if (!fs.existsSync(file)) {
        console.warn('skip (missing):', item.file);
        continue;
      }
      const html = fs.readFileSync(file, 'utf8');
      const article = (html.match(/<article[^>]*class="docs-article"[\s\S]*?<\/article>/i) || [html])[0];
      const headings = matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi, article).filter(Boolean);
      const body = extractSearchText(article);
      index.push({
        title: item.title,
        group: group.group,
        file: item.file,
        headings: headings.slice(0, 24),
        text: body.slice(0, 600)
      });
    }
  }

  const out = path.join(here, 'search-index.json');
  fs.writeFileSync(out, JSON.stringify(index));
  console.log(`Wrote ${index.length} entries to ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
  return index;
};

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  buildSearchIndex();
}
