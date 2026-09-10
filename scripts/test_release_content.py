"""Check support links and same-site resource loading in the release files."""

from html.parser import HTMLParser
from pathlib import Path
import runpy
import unittest
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CHECKER = runpy.run_path(str(ROOT / 'scripts/check-site.py'))


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.external = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        resource = attrs.get('src') if tag in ('script', 'img', 'source', 'video', 'audio', 'iframe', 'track') else None
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'preconnect', 'prefetch', 'preload', 'dns-prefetch'):
            resource = attrs.get('href')
        if resource and (urlsplit(resource).netloc or urlsplit(resource).scheme in ('http', 'https')):
            self.external.append(resource)


class ReleaseContentTests(unittest.TestCase):
    def test_store_first_homepage(self):
        page = (ROOT / 'index.html').read_text()
        self.assertIn('Coming to the Mac App Store', page)
        self.assertIn('data-cta="store-hero"', page)
        self.assertNotIn('data-cta="agent-hero"', page)
        self.assertNotIn('>DMG instructions</a>', page)
        self.assertNotIn('>Build instructions</a>', page)
        self.assertNotIn('>Agent setup</a>', page)
        self.assertNotIn('>Claude Code setup</a>', page)
        self.assertNotIn('install-card-primary', page)
        self.assertNotIn('>ESM protein design</a>', page)
        self.assertNotIn('>Agent control plane</a>', page)
        self.assertNotIn('>CLI reference</a>', page)
        self.assertNotIn('Dry run with an external agent.', page)

    def test_editions_and_source_guides(self):
        self.assertIn(ROOT / 'docs/editions.html', CHECKER['publication_files'](ROOT))
        for name in ('agents/codex.html', 'agents/claude-code.html', 'agents/gemini-cli.html', 'docs/cli.html', 'docs/mcp-setup.html', 'docs/terminal-dock.html', 'docs/esm-design.html'):
            with self.subTest(name=name):
                self.assertIn('data-edition-note', (ROOT / name).read_text())
                self.assertIn('not bundled with the first Store release', (ROOT / name).read_text())

    def test_hosting_privacy(self):
        self.assertIn("GitHub logs visitors' IP addresses for security purposes", (ROOT / 'privacy.html').read_text())

    def test_support_is_exported(self):
        self.assertIn(ROOT / 'support.html', CHECKER['publication_files'](ROOT))

    def test_contact_is_consistent(self):
        for name in ('support.html', 'privacy.html', 'docs/privacy.html', 'docs/security.html'):
            with self.subTest(name=name):
                self.assertIn('mailto:kingtelomere@gmail.com', (ROOT / name).read_text())

    def test_pages_load_resources_from_the_site(self):
        for path in CHECKER['publication_files'](ROOT):
            if path.suffix == '.html':
                with self.subTest(file=str(path.relative_to(ROOT))):
                    parser = Resources()
                    parser.feed(path.read_text())
                    self.assertEqual(parser.external, [])

    def test_downloads_do_not_point_at_an_unavailable_store_listing(self):
        for path in CHECKER['publication_files'](ROOT):
            if path.suffix == '.html':
                self.assertNotIn('href="https://apps.apple.com/', path.read_text())


if __name__ == '__main__':
    unittest.main()
