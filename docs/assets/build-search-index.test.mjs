import assert from 'node:assert/strict';
import test from 'node:test';

import { extractSearchText } from './build-search-index.mjs';

test('extractSearchText includes a docs lede exactly once', () => {
  const article = `
    <article class="docs-article">
      <h1>Install SEAL</h1>
      <p class="summary docs-lede">SEAL 2.2.1 is the current release.</p>
      <p>Download the five release files.</p>
    </article>
  `;

  const text = extractSearchText(article);

  assert.equal(
    text,
    'SEAL 2.2.1 is the current release. Download the five release files.'
  );
  assert.equal(
    text.match(/SEAL 2\.2\.1 is the current release\./g)?.length,
    1
  );
});
