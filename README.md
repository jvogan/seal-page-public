# SEAL Pages

The static product and documentation site for SEAL, a local-first macOS
workbench for sequences and lab records. SEAL is coming to the Mac App Store
first. The source repository and direct-download edition will launch later.
The edition guide identifies source-only tools and direct-edition recordings.

## Preview

The site needs no frontend build or package installation. Serve it locally:

```bash
python3 scripts/serve.py
```

Open <http://127.0.0.1:8821/>.
The preview server supports byte-range requests so video chapter jumps work.
Pass a directory to preview an export, or use `--port` to choose another port.

## Content

- `index.html`: product overview and installation options
- `support.html` and `privacy.html`: support contact and privacy information
- `docs/editions.html`: Store and direct-edition differences
- `try.html` and `workflows.html`: sample workflows
- `docs/`: installation, sequence tools, notebook, and reference pages
- `agents/`: optional setup for Claude Code, Codex, and Gemini CLI
- `assets/` and `docs/assets/`: images, styles, scripts, and the search index
- `llms.txt`: documentation links for agents

Examples and screenshots use project-authored synthetic fixtures. Keep image
captions and feature descriptions consistent with the app version they show.

## Check changes

Run the static checks with Python 3.9 or later:

```bash
python3 scripts/check-site.py
```

The checker validates local links and fragments, image attributes, JSON, and
caption timing. It scans files eligible for export for selected credential and
personal-path patterns. It does not contact external URLs or verify release
availability.

After changing a documentation title, description, or heading, regenerate the
search index with Node.js:

```bash
node docs/assets/build-search-index.mjs
node --test docs/assets/build-search-index.test.mjs
```

## Screen recordings

The [tutorial catalog](docs/tutorials.html) contains eight lessons with narration,
English captions, chapter buttons, transcripts, and written steps. Videos use
H.264 and AAC in MP4 files. Players use `preload="none"` and do not autoplay.

Keep MP4 recordings and UTF-8 WebVTT captions in `assets/videos/`. Reference the
MP4 with `<video>` or `<source>`, the poster with `poster`, and captions with a
`<track kind="captions" srclang="en" label="English">` element. Use paths relative
to the page so recordings also work when the site is hosted under a path prefix.
Include written steps beside each recording.

The checker verifies media links, caption headers, and cue timing. It scans
captions and HTML for the same credential and personal-path patterns as other
public text. Review each recording and poster for private content, and verify
playback and caption alignment before export. The static checker does not
decode video or inspect its frames.

MP4 and VTT files are exported only from `assets/videos/`. They play through the
browser's video controls and need no backend, CDN, or frontend build.

```bash
python3 -B -m unittest discover -s scripts -p 'test_*.py'
```

## Prepare a Pages directory

Export to a new or empty directory outside this checkout:

```bash
python3 scripts/prepare-pages.py --out ../seal-pages-export
python3 scripts/check-site.py ../seal-pages-export
```

The exporter copies an allowlist of static pages and assets. It excludes Git
metadata, this README, maintenance scripts, and test sources. It checks the
source and output, leaves source files unchanged, and refuses to overwrite a
nonempty output directory.

For publication, supply the verified address with `--site-url`. This sets
canonical, Open Graph, and structured-data URLs, fixes asset paths on nested
404 responses, and generates `sitemap.xml` and `robots.txt`. To enable marked
repository and release links, supply their verified destinations:

```bash
python3 scripts/prepare-pages.py \
  --out ../seal-pages-export \
  --site-url https://example.org/seal/ \
  --repository-url https://github.com/example/seal \
  --release-url https://github.com/example/seal/releases
```

Replace the example URLs before publication. Without these options, repository
links keep their local installation-guide destinations, and the export adds no
canonical address or search-engine indexing files. An export without
`--site-url` is suitable for local previews; its 404 page needs that address to
work at nested missing URLs. The command prepares files; it does not publish
them. Configure the hosting service to serve the exported directory and preserve
`.nojekyll`.

Crawlers read `robots.txt` at the domain root. On a repository site such as
`https://example.org/seal/`, submit `/seal/sitemap.xml` to your search console
directly; `/seal/robots.txt` does not control crawling of that site.

Repository links use `data-repository-path` on an anchor, with an empty value for
the repository root or a path such as `/blob/main/README.md`. Download links use
`data-release-link`. Keep each anchor's `href` useful without these options.

## Publish to GitHub Pages

The [Pages workflow](.github/workflows/pages.yml) checks the site, prepares the
export, and publishes that directory. It runs only when you select **Run
workflow** on `main`. Commits and pull requests do not trigger publication.

To publish the site:

1. In the repository's **Settings → Pages**, select **GitHub Actions** as the
   source. Choose the site's visibility before continuing.
2. In **Actions**, open **Publish GitHub Pages** and select **Run workflow**.
3. Select `main`. Optionally enter the verified SEAL app repository URL and its
   release or downloads URL. Leave an unavailable destination blank.
4. Select **Run workflow**. Open the deployment URL after the workflow succeeds.

The workflow reads the site's address from GitHub Pages, including the repository
path or custom domain. It uses that address for canonical links, the sitemap,
and the custom 404 page. Only the checked export is uploaded.

A private source repository does not make a standard Pages site private.
Private Pages sites require an organization on GitHub Enterprise Cloud. See
[GitHub's Pages visibility rules](https://docs.github.com/en/enterprise-cloud%40latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).

## License

MIT for the site code and copy. Screenshots are derivative of the SEAL app.
