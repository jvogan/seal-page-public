#!/usr/bin/env python3
"""Check the static files that are eligible for a Pages export."""

import argparse
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT_FILES = {
    'index.html', 'workflows.html', 'try.html', 'privacy.html', 'support.html', '404.html',
    'styles.css', 'script.js', '.nojekyll', 'llms.txt',
}
ROOT_DIRECTORIES = {'assets', 'docs', 'agents'}
STATIC_EXTENSIONS = {
    '.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg',
    '.webp', '.gif', '.ico', '.avif', '.woff', '.woff2', '.ttf', '.otf',
}
MEDIA_EXTENSIONS = {'.mp4', '.vtt'}
TEXT_EXTENSIONS = {'.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.vtt'}
GENERATED_FILES = {'robots.txt', 'sitemap.xml'}
SENSITIVE_PATTERNS = {
    'personal machine path': re.compile(r'/Users/(?!you(?:/|\b)|example(?:/|\b))[^\s"<>]+|/Volumes/[^\s"<>]+'),
    'private key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),
    'GitHub token': re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b'),
    'provider token': re.compile(r'\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}\b'),
    'AWS access key': re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
    'credential assignment': re.compile(r'''(?i)["']?(?:api[_-]?key|client[_-]?secret|password|access[_-]?token)["']?\s*[:=]\s*["'][A-Za-z0-9+/=_-]{24,}["']'''),
}


def publication_files(root):
    """Return an exact allowlist; fail rather than follow a symlink."""
    found = []
    for name in sorted(ROOT_FILES):
        path = root / name
        if path.is_symlink():
            raise ValueError(f'{name}: symlinks are not allowed')
        if path.is_file():
            found.append(path)
    for name in sorted(ROOT_DIRECTORIES):
        directory = root / name
        if directory.is_symlink():
            raise ValueError(f'{name}: symlinks are not allowed')
        if not directory.exists():
            continue
        for path in sorted(directory.rglob('*')):
            relative = path.relative_to(root)
            if path.is_symlink():
                raise ValueError(f'{relative}: symlinks are not allowed')
            if any(part.startswith('.') for part in relative.parts):
                continue
            if '.test.' in path.name or '.spec.' in path.name:
                continue
            is_video_asset = relative.parts[:2] == ('assets', 'videos') and path.suffix.lower() in MEDIA_EXTENSIONS
            if path.is_file() and (path.suffix.lower() in STATIC_EXTENSIONS or is_video_asset):
                found.append(path)
    return found


def check_captions(text):
    """Check basic WebVTT cue syntax without decoding the companion video."""
    lines = text.lstrip('\ufeff').splitlines()
    if not lines or not re.fullmatch(r'WEBVTT(?:[ \t].*)?', lines[0]) or '-->' in lines[0]:
        return [(1, 'captions need a WEBVTT header')]
    errors = []
    boundary = next((index for index, line in enumerate(lines[1:], 1) if not line.strip()), None)
    if boundary is None:
        return [(1, 'captions need a blank line after the header and at least one cue')]
    timestamp = r'(?:[0-9]{2,}:)?[0-5][0-9]:[0-5][0-9]\.[0-9]{3}'
    timing = re.compile(rf'^({timestamp})[ \t]+-->[ \t]+({timestamp})(?:[ \t]+.*)?$')

    def milliseconds(value):
        fields = value.split(':')
        seconds, fraction = fields[-1].split('.')
        hours = int(fields[0]) if len(fields) == 3 else 0
        return ((hours * 60 + int(fields[-2])) * 60 + int(seconds)) * 1000 + int(fraction)

    index = boundary + 1
    previous_start = -1
    cues = 0
    while index < len(lines):
        if not lines[index].strip():
            index += 1
            continue
        first = index
        while index < len(lines) and lines[index].strip():
            index += 1
        block = lines[first:index]
        if re.match(r'^NOTE(?:[ \t]|$)', block[0]) or block[0] in ('STYLE', 'REGION'):
            continue
        timing_index = 0 if '-->' in block[0] else 1
        match = timing.fullmatch(block[timing_index]) if timing_index < len(block) else None
        if match is None:
            errors.append((first + 1, 'caption cue needs valid start and end timestamps'))
            continue
        cues += 1
        start, end = (milliseconds(value) for value in match.groups())
        if end <= start:
            errors.append((first + timing_index + 1, 'caption cue must end after it starts'))
        if start < previous_start:
            errors.append((first + timing_index + 1, 'caption cues must be ordered by start time'))
        previous_start = start
        payload = '\n'.join(block[timing_index + 1:])
        if not re.sub(r'<[^>]*>', '', payload).strip():
            errors.append((first + 1, 'caption cue needs text'))
        if '-->' in payload:
            errors.append((first + 1, 'caption cues need a blank line between them'))
    if not cues:
        errors.append((1, 'captions need at least one timed cue'))
    return errors


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.errors = []
        self.heading = None
        self.headings = []
        self.docs_runtime = False
        self.json_ld = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        line = self.getpos()[0]
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                self.errors.append((line, 'duplicate element ID'))
            self.ids.add(attrs['id'])
        if tag in ('h2', 'h3'):
            self.heading = [attrs.get('id'), [], line]
        if tag == 'script' and 'docs.js' in attrs.get('src', ''):
            self.docs_runtime = True
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.json_ld = [[], line]
        for attribute in ('href', 'src', 'poster'):
            if attribute in attrs:
                self.links.append((attrs[attribute], line))
        if 'srcset' in attrs:
            for candidate in attrs['srcset'].split(','):
                if candidate.strip():
                    self.links.append((candidate.strip().split()[0], line))
        if tag == 'track' and not attrs.get('src'):
            self.errors.append((line, 'media track needs a source file'))
        if tag == 'img':
            if 'alt' not in attrs:
                self.errors.append((line, 'image is missing alt text (use alt="" for a decorative image)'))
            for dimension in ('width', 'height'):
                if not re.fullmatch(r'[1-9][0-9]*', attrs.get(dimension, '')):
                    self.errors.append((line, f'image needs a positive integer {dimension}'))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self.heading is not None:
            self.heading[1].append(data)
        if self.json_ld is not None:
            self.json_ld[0].append(data)

    def handle_endtag(self, tag):
        if tag in ('h2', 'h3') and self.heading is not None:
            self.headings.append(self.heading)
            self.heading = None
        if tag == 'script' and self.json_ld is not None:
            try:
                json.loads(''.join(self.json_ld[0]))
            except ValueError:
                self.errors.append((self.json_ld[1], 'invalid JSON-LD'))
            self.json_ld = None

    def finish(self):
        if self.docs_runtime:
            for explicit_id, parts, line in self.headings:
                if explicit_id is not None:
                    continue
                # Match docs/assets/docs.js: JavaScript \w is ASCII.
                slug = re.sub(r'[^a-z0-9_\s-]', '', ''.join(parts).lower().strip())
                slug = re.sub(r'\s+', '-', slug)[:64]
                if slug in self.ids:
                    self.errors.append((line, 'duplicate heading ID generated by docs.js'))
                self.ids.add(slug)


def check(root):
    root = root.resolve()
    errors = []
    try:
        files = publication_files(root)
    except ValueError as error:
        return [str(error)], 0
    for name in sorted(GENERATED_FILES):
        path = root / name
        if path.is_symlink():
            errors.append(f'{name}: symlinks are not allowed')
        elif path.is_file():
            files.append(path)
    allowed = {path.resolve() for path in files}
    for required in ('index.html', 'styles.css', 'script.js', '.nojekyll', 'llms.txt'):
        if not (root / required).is_file():
            errors.append(f'{required}: required site file is missing')
    pages = {}
    texts = {}
    for path in files:
        relative = path.relative_to(root)
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except (UnicodeError, OSError):
            errors.append(f'{relative}: cannot read UTF-8 text')
            continue
        texts[path] = text
        for label, pattern in SENSITIVE_PATTERNS.items():
            match = pattern.search(text)
            if match:
                line = text.count('\n', 0, match.start()) + 1
                errors.append(f'{relative}:{line}: possible {label}; matched value withheld')
        if path.suffix == '.html':
            page = Page()
            page.feed(text)
            page.close()
            page.finish()
            pages[path.resolve()] = page
            errors.extend(f'{relative}:{line}: {message}' for line, message in page.errors)
        elif path.suffix == '.vtt':
            errors.extend(f'{relative}:{line}: {message}' for line, message in check_captions(text))
        elif path.suffix == '.json':
            try:
                json.loads(text)
            except ValueError:
                errors.append(f'{relative}: invalid JSON')

    def local_target(source, value, line):
        if not value or value.startswith(('mailto:', 'tel:', 'data:', 'http:', 'https:', '//')):
            return
        try:
            parsed = urlsplit(value)
        except ValueError:
            errors.append(f'{source.relative_to(root)}:{line}: malformed link')
            return
        if parsed.scheme:
            errors.append(f'{source.relative_to(root)}:{line}: unsupported local link scheme')
            return
        raw_path = unquote(parsed.path)
        if raw_path.startswith('/'):
            errors.append(f'{source.relative_to(root)}:{line}: root-relative link loses the repository path prefix; use a relative path')
            return
        target = source.parent / raw_path if raw_path else source
        target = target.resolve()
        if not target.is_relative_to(root):
            errors.append(f'{source.relative_to(root)}:{line}: local link escapes site root')
            return
        if target.is_dir():
            target /= 'index.html'
        if target not in allowed:
            errors.append(f'{source.relative_to(root)}:{line}: missing or excluded local target')
        elif parsed.fragment and target in pages:
            if unquote(parsed.fragment) not in pages[target].ids:
                errors.append(f'{source.relative_to(root)}:{line}: missing target fragment')

    for path, page in pages.items():
        for value, line in page.links:
            local_target(path, value, line)
    for path, text in texts.items():
        if path.suffix == '.css':
            for match in re.finditer(r'url\(\s*[\'"]?([^\s)\'"]+)', text):
                value = match.group(1)
                if not value.startswith('#'):
                    local_target(path, value, text.count('\n', 0, match.start()) + 1)
        elif path.name == 'llms.txt':
            for match in re.finditer(r'\]\(([^)]+)\)', text):
                local_target(path, match.group(1), text.count('\n', 0, match.start()) + 1)
    return errors, len(pages)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.is_dir():
        parser.error('root must be an existing directory')
    errors, count = check(root)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        print(f'Failed: {len(errors)} issue(s) in {count} HTML pages.', file=sys.stderr)
        return 1
    print(f'Passed: {count} HTML pages, local links, fragments, images, captions, JSON, and public text checks.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
