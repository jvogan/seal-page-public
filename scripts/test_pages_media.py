"""Focused checks for static video and caption publication."""

import contextlib
import io
import json
from pathlib import Path
import re
import runpy
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urljoin

SCRIPTS = Path(__file__).resolve().parent
CHECKER = runpy.run_path(str(SCRIPTS / 'check-site.py'))
EXPORTER = runpy.run_path(str(SCRIPTS / 'prepare-pages.py'))
CAPTIONS = '''WEBVTT

intro
00:00.000 --> 00:02.500
Open the synthetic sample.

00:02.500 --> 00:05.000
Inspect its features.
'''


class MediaPublicationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='seal-media-check-')
        self.addCleanup(self.temporary.cleanup)
        self.root = (Path(self.temporary.name) / 'source').resolve()
        (self.root / 'assets/videos').mkdir(parents=True)
        (self.root / 'docs').mkdir()
        self.page = '''<!doctype html><html><head><title>Guide</title></head><body>
<h1 id="steps">Guide</h1>
<video controls poster="assets/videos/guide.svg">
  <source src="assets/videos/guide.mp4" type="video/mp4">
  <track kind="captions" src="assets/videos/guide.vtt" srclang="en" label="English" default>
</video>
<a href="docs/guide.html">Written steps</a>
</body></html>'''
        for name, text in {
            'index.html': self.page,
            'docs/guide.html': '<html><body><h1>Written steps</h1><p>Open a synthetic sample.</p></body></html>',
            'assets/videos/guide.vtt': CAPTIONS,
            'assets/videos/guide.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
            '.nojekyll': '',
            'styles.css': 'body {}',
            'script.js': '// Static runtime',
            'llms.txt': '[Guide](docs/guide.html)',
        }.items():
            (self.root / name).write_text(text, encoding='utf-8')
        # The checker checks links and copying, not media encoding or playback.
        self.video_bytes = b'static-media-copy-fixture'
        (self.root / 'assets/videos/guide.mp4').write_bytes(self.video_bytes)

    def errors(self):
        return CHECKER['check'](self.root)[0]

    def test_valid_recording_and_caption_links(self):
        self.assertEqual(self.errors(), [])
        nested = self.page.replace('assets/videos/', '../assets/videos/').replace('href="docs/guide.html"', 'href="guide.html"')
        (self.root / 'docs/guide.html').write_text(nested, encoding='utf-8')
        self.assertEqual(self.errors(), [])

    def test_missing_video_track_or_poster_fails(self):
        for suffix in ('mp4', 'vtt', 'svg'):
            with self.subTest(suffix=suffix):
                path = self.root / f'assets/videos/guide.{suffix}'
                contents = path.read_bytes()
                path.unlink()
                self.assertTrue(any('missing or excluded local target' in error for error in self.errors()))
                path.write_bytes(contents)
        (self.root / 'index.html').write_text(self.page.replace('src="assets/videos/guide.vtt"', ''), encoding='utf-8')
        self.assertTrue(any('track needs a source file' in error for error in self.errors()))

    def test_invalid_caption_header_and_timing_fail(self):
        invalid = {
            'header': CAPTIONS.replace('WEBVTT', 'captions'),
            'reversed cue': CAPTIONS.replace('00:00.000 --> 00:02.500', '00:03.000 --> 00:02.500'),
            'timestamp fields': CAPTIONS.replace('00:00.000', '00:60.000'),
            'out of order': CAPTIONS.replace('00:02.500 --> 00:05.000', '00:00.000 --> 00:05.000').replace('00:00.000 --> 00:02.500', '00:01.000 --> 00:02.500'),
            'empty cue': 'WEBVTT\n\n00:00.000 --> 00:01.000\n',
            'no cue separator': 'WEBVTT\n\n00:00.000 --> 00:01.000\nFirst\n00:01.000 --> 00:02.000\nSecond\n',
        }
        for name, text in invalid.items():
            with self.subTest(name=name):
                (self.root / 'assets/videos/guide.vtt').write_text(text, encoding='utf-8')
                self.assertTrue(any('caption' in error for error in self.errors()))

    def test_supported_caption_forms(self):
        text = '\ufeffWEBVTT - English captions\r\n\r\nNOTE Synthetic example\r\n\r\nintro\r\n00:00:01.000 --> 00:00:03.000 align:start\r\n<v Guide>Inspect the sample.</v>\r\n\r\n00:00:02.000 --> 00:00:04.000\r\nOverlapping text is valid.\r\n'
        (self.root / 'assets/videos/guide.vtt').write_text(text, encoding='utf-8')
        self.assertEqual(self.errors(), [])

    def test_caption_and_guide_privacy_diagnostics_withhold_values(self):
        sentinel = 'ghp_' + 'A' * 36
        for name in ('assets/videos/guide.vtt', 'docs/guide.html'):
            with self.subTest(name=name):
                path = self.root / name
                original = path.read_text(encoding='utf-8')
                path.write_text(original + '\n' + sentinel, encoding='utf-8')
                errors = self.errors()
                self.assertTrue(any('GitHub token' in error for error in errors))
                self.assertTrue(all(sentinel not in error for error in errors))
                path.write_text(original, encoding='utf-8')

    def test_export_keeps_media_static_and_excludes_other_sources(self):
        (self.root / 'docs/excluded.mp4').write_bytes(self.video_bytes)
        (self.root / 'assets/videos/notes.md').write_text('Production notes stay out.', encoding='utf-8')
        (self.root / 'assets/videos/capture.test.js').write_text('// Test source', encoding='utf-8')
        (self.root / 'README.md').write_text('Maintenance instructions', encoding='utf-8')
        main = EXPORTER['main']
        output = self.root.parent / 'export'
        arguments = ['prepare-pages.py', '--out', str(output), '--site-url', 'https://example.org/seal/']
        with patch.dict(main.__globals__, {'SOURCE': self.root}), patch.object(sys, 'argv', arguments), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main(), 0)
        self.assertEqual((output / 'assets/videos/guide.mp4').read_bytes(), self.video_bytes)
        self.assertEqual((output / 'assets/videos/guide.vtt').read_text(encoding='utf-8'), CAPTIONS)
        for name in ('docs/excluded.mp4', 'assets/videos/notes.md', 'assets/videos/capture.test.js', 'README.md'):
            self.assertFalse((output / name).exists(), name)
        self.assertEqual(CHECKER['check'](output)[0], [])
        self.assertEqual(urljoin('https://example.org/seal/index.html', 'assets/videos/guide.mp4'), 'https://example.org/seal/assets/videos/guide.mp4')
        self.assertEqual((self.root / 'index.html').read_text(encoding='utf-8'), self.page)

    def test_root_relative_links_fail_in_pages_styles_and_agent_index(self):
        for name, text in {
            'index.html': self.page.replace('href="docs/guide.html"', 'href="/docs/guide.html"'),
            'styles.css': 'body { background: url(/assets/videos/guide.svg); }',
            'llms.txt': '[Guide](/docs/guide.html)',
        }.items():
            with self.subTest(name=name):
                path = self.root / name
                original = path.read_text(encoding='utf-8')
                path.write_text(text, encoding='utf-8')
                self.assertTrue(any('root-relative link loses the repository path prefix' in error for error in self.errors()))
                path.write_text(original, encoding='utf-8')

    def test_verified_site_url_updates_structured_data(self):
        data = {
            '@context': 'https://schema.org', '@type': 'TechArticle',
            'headline': 'Use an agent', 'image': '../assets/videos/guide.svg',
            'author': {'url': 'https://example.org/author'},
            'about': {'@type': 'SoftwareApplication', 'name': 'SEAL'},
        }
        source = '<html><head><script type="application/ld+json">' + json.dumps(data) + '</script></head></html>'
        for site_url in ('https://example.org', 'https://example.org/repo-name'):
            with self.subTest(site_url=site_url):
                stamped = EXPORTER['stamp'](source, Path('agents/guide.html'), site_url, None, None)
                actual = json.loads(re.search(r'<script[^>]*>(.*?)</script>', stamped, re.S).group(1))
                self.assertEqual(actual['url'], site_url + '/agents/guide.html')
                self.assertEqual(actual['about']['url'], site_url + '/')
                self.assertEqual(actual['image'], site_url + '/assets/videos/guide.svg')
                self.assertEqual(actual['author'], data['author'])
        self.assertEqual(EXPORTER['stamp'](source, Path('agents/guide.html'), None, None, None), source)

    def test_custom_404_resolves_assets_and_skip_link_at_missing_nested_url(self):
        source = '<html><head><link href="styles.css"></head><body><a href="#main">Skip</a><main id="main"></main></body></html>'
        for site_url in ('https://example.org', 'https://example.org/repo-name'):
            with self.subTest(site_url=site_url):
                stamped = EXPORTER['stamp'](source, Path('404.html'), site_url, None, None)
                base_tag = re.search(r'<base\b[^>]*>', stamped).group(0)
                base = EXPORTER['Tag'](base_tag).attrs['href']
                missing_url = site_url + '/missing/deep/page'
                self.assertEqual(urljoin(missing_url, base), site_url + '/')
                self.assertEqual(urljoin(base, 'styles.css'), site_url + '/styles.css')
                self.assertIn('href="404.html#main"', stamped)


if __name__ == '__main__':
    unittest.main()
