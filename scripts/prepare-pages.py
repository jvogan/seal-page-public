#!/usr/bin/env python3
"""Copy a checked static site to a separate directory for publication."""

import argparse
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import runpy
import shutil
import sys
import tempfile
from urllib.parse import quote, unquote, urljoin, urlsplit
from xml.etree import ElementTree as ET

CHECKER = runpy.run_path(str(Path(__file__).with_name('check-site.py')))
SOURCE = Path(__file__).resolve().parent.parent


def https_url(value):
    try:
        url = urlsplit(value)
        valid = (
            url.scheme == 'https' and bool(url.hostname)
            and url.username is None and url.password is None
            and not url.query and not url.fragment
            and not any(character.isspace() or ord(character) < 32 for character in value)
            and '\\' not in value
        )
        # Accessing port also validates the port syntax and range.
        url.port
    except ValueError:
        valid = False
    if not valid:
        raise argparse.ArgumentTypeError('use an HTTPS URL without credentials, a query, or a fragment')
    return value.rstrip('/')


class Tag(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.attrs = {}
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        self.attrs = dict(attributes)

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)


def set_attribute(tag, name, value):
    attribute = f'{name}="{escape(value, quote=True)}"'
    pattern = re.compile(r'(?<![\w:-])' + re.escape(name) + r'''\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)''', re.I)
    if pattern.search(tag):
        return pattern.sub(lambda _: attribute, tag, count=1)
    return tag[:-1] + ' ' + attribute + '>'


def stamp(text, relative, site_url, repository_url, release_url):
    def anchor(match):
        tag = match.group(0)
        attrs = Tag(tag).attrs
        destination = None
        if 'data-release-link' in attrs and release_url:
            destination = release_url
        elif 'data-repository-path' in attrs and repository_url:
            suffix = attrs['data-repository-path'] or ''
            parsed = urlsplit(suffix)
            if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or '\\' in suffix:
                raise ValueError(f'{relative}: invalid repository link marker')
            if any(part in ('.', '..') for part in unquote(suffix).split('/')) or any(character.isspace() for character in suffix):
                raise ValueError(f'{relative}: invalid repository link marker')
            destination = repository_url + ('/' + suffix.lstrip('/') if suffix else '')
        elif site_url and relative.as_posix() == '404.html' and attrs.get('href', '').startswith('#'):
            destination = '404.html' + attrs['href']
        return set_attribute(tag, 'href', destination) if destination else tag

    text = re.sub(r'<a\b[^>]*>', anchor, text, flags=re.I)
    image = 'assets/img/og-image.jpg'

    def metadata(match):
        nonlocal image
        tag = match.group(0)
        attrs = Tag(tag).attrs
        if 'canonical' in attrs.get('rel', '').lower().split():
            return ''
        if attrs.get('property', '').lower() == 'og:url':
            return ''
        if (attrs.get('name') or attrs.get('property', '')).lower() == 'twitter:image' and site_url:
            candidate = attrs.get('content', '')
            if candidate and not urlsplit(candidate).scheme and not candidate.startswith('//'):
                destination = urljoin(site_url + '/', urljoin(relative.as_posix(), candidate))
                return set_attribute(tag, 'content', destination)
        if attrs.get('property', '').lower() == 'og:image':
            candidate = attrs.get('content', '')
            if candidate and not urlsplit(candidate).scheme and not candidate.startswith('//'):
                image = urljoin(relative.as_posix(), candidate)
            return ''
        return tag

    text = re.sub(r'<(?:link|meta)\b[^>]*>', metadata, text, flags=re.I)
    if site_url:
        base = site_url + '/'
        if relative.as_posix() == '404.html':
            text = re.sub(r'<base\b[^>]*>', '', text, flags=re.I)
            base_tag = f'\n  <base href="{escape(base, quote=True)}" />'
            text = re.sub(r'<head\b[^>]*>', lambda match: match.group(0) + base_tag, text, count=1, flags=re.I)
        page_path = relative.as_posix()
        if page_path.endswith('index.html'):
            page_path = page_path[:-len('index.html')]
        canonical = base + quote(page_path, safe='/')

        def structured_metadata(match):
            opening, content, closing = match.groups()
            if Tag(opening).attrs.get('type', '').lower() != 'application/ld+json':
                return match.group(0)
            data = json.loads(content)
            if not isinstance(data, dict):
                return match.group(0)
            data['url'] = canonical
            candidate = data.get('image')
            if isinstance(candidate, str) and not urlsplit(candidate).scheme and not candidate.startswith('//'):
                data['image'] = urljoin(base, urljoin(relative.as_posix(), candidate))
            about = data.get('about')
            if isinstance(about, dict) and about.get('@type') == 'SoftwareApplication' and about.get('name') == 'SEAL':
                about['url'] = base
            serialized = json.dumps(data, ensure_ascii=False, indent=2).replace('<', '\\u003c')
            return opening + '\n' + serialized + '\n' + closing

        text = re.sub(r'(<script\b[^>]*>)([\s\S]*?)(</script\s*>)', structured_metadata, text, flags=re.I)
        tags = (
            f'  <link rel="canonical" href="{escape(canonical, quote=True)}" />\n'
            f'  <meta property="og:url" content="{escape(canonical, quote=True)}" />\n'
            f'  <meta property="og:image" content="{escape(urljoin(base, image), quote=True)}" />\n'
        )
        text = re.sub(r'</head\s*>', lambda _: tags + '</head>', text, count=1, flags=re.I)
    return text


def write_indexing(root, site_url, html_files):
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', namespace)
    sitemap = ET.Element(f'{{{namespace}}}urlset')
    for relative in sorted(html_files):
        if relative.as_posix() == '404.html':
            continue
        path = relative.as_posix()
        if path.endswith('index.html'):
            path = path[:-len('index.html')]
        item = ET.SubElement(sitemap, f'{{{namespace}}}url')
        ET.SubElement(item, f'{{{namespace}}}loc').text = site_url + '/' + quote(path, safe='/')
    ET.indent(sitemap, space='  ')
    ET.ElementTree(sitemap).write(root / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    (root / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {site_url}/sitemap.xml\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path, help='empty or new directory outside the source tree')
    parser.add_argument('--site-url', type=https_url, help='HTTPS site base, including any path prefix')
    parser.add_argument('--repository-url', type=https_url, help='HTTPS repository page URL')
    parser.add_argument('--release-url', type=https_url, help='HTTPS release or downloads page URL')
    args = parser.parse_args()
    output = args.out.resolve()
    if output == SOURCE or output.is_relative_to(SOURCE):
        parser.error('--out must be outside the source tree')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--out must be a new or empty directory')
    errors, count = CHECKER['check'](SOURCE)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        print('Export stopped: fix the source checks first.', file=sys.stderr)
        return 1
    output.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.seal-pages-', dir=output.parent))
    try:
        html_files = []
        files = CHECKER['publication_files'](SOURCE)
        for source in files:
            relative = source.relative_to(SOURCE)
            destination = stage / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            if source.suffix == '.html':
                text = stamp(source.read_text(encoding='utf-8'), relative, args.site_url, args.repository_url, args.release_url)
                destination.write_text(text, encoding='utf-8')
                html_files.append(relative)
            else:
                shutil.copyfile(source, destination)
        if args.site_url:
            write_indexing(stage, args.site_url, html_files)
        errors, exported_count = CHECKER['check'](stage)
        if errors:
            for error in errors:
                print(error, file=sys.stderr)
            raise ValueError('exported site did not pass verification')
        if output.exists():
            # Recheck immediately before replacing the empty directory.
            output.rmdir()
        stage.rename(output)
        print(f'Prepared {exported_count} HTML pages and {len(files)} static files. Source files were unchanged.')
        print('Run check-site.py with the output directory to verify the export again.')
        return 0
    except (OSError, ValueError) as error:
        print(f'Export stopped: {error}', file=sys.stderr)
        return 1
    finally:
        if stage.exists():
            shutil.rmtree(stage)


if __name__ == '__main__':
    sys.exit(main())
