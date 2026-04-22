# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal blog/website built with Hugo (v0.160.1 extended) using the hugo-book theme. The site is deployed to GitHub Pages at https://holosam.dev/.

## Development Commands

Common tasks are available via `make`:

```bash
make help             # Show all available commands
make serve            # Start dev server with drafts
make build            # Production build (--gc --minify)
make new-post name=x  # Create a new post
make compress-image src=path/to/image.png  # Convert image to WebP
make compress-all     # Convert all PNG/JPG in static/images/ to WebP
make clean            # Remove generated files
```

**Required tools:** Hugo extended (`brew install hugo`), cwebp (`brew install webp`)

### Testing
The repository has a GitHub Actions workflow that automatically tests builds and runs `htmltest` link validation on pull requests to main.

## Architecture

### Content Structure
- **Posts**: Located in `content/posts/`. Each post is a markdown file with front matter.
- **Home Page**: Custom template at `layouts/index.html` lists paginated recent posts with descriptions.
- **Front Matter**: Posts use YAML front matter with fields:
  - `title`: Post title
  - `date`: Publication date (format: `2025-02-17T08:00:00-07:00`)
  - `description`: Short description (shown on home page)
  - `tags`: Array of tag strings
  - `image`: Path relative to `static/` for Open Graph images (e.g., `images/my-image.webp`)
  - `series`: (optional) Array with series name for grouping related posts

### Theme Integration (hugo-book)
- Theme is included as a git submodule in `themes/hugo-book/`
- Custom overrides:
  - `assets/_fonts.scss`: Self-hosted Figtree font (woff2 files in `static/fonts/`)
  - `assets/_custom.scss`: Custom styles for home page, series nav, pagination
  - `layouts/partials/docs/inject/head.html`: Open Graph images + JSON-LD structured data
  - `layouts/partials/series-nav.html`: Series prev/next navigation
  - `layouts/posts/single.html`: Post layout with series nav
  - `layouts/index.html`: Custom home page with pagination
  - `layouts/_default/_markup/render-image.html`: Adds `loading="lazy"` to all markdown images

### Static Assets
- `static/images/`: Post images (WebP format)
- `static/fonts/`: Self-hosted Figtree font files (woff2)
- `static/banner.png`: Default Open Graph image (kept as PNG for social platform compatibility)
- `static/favicon.png`: Site favicon

### Configuration (`hugo.yaml`)
- Base URL: `https://holosam.dev/`
- `enableGitInfo: true` for last-modified dates from git history
- Markup: `unsafe: true` to allow inline HTML in markdown
- Menu: Posts, GitHub, Bluesky, RSS links
- Taxonomies: `tags` and `series`

### Deployment
- **Auto-deployment**: Pushes to `main` branch trigger `.github/workflows/hugo_deploy.yaml`
- **PR Testing**: Pull requests trigger `.github/workflows/hugo_test_build.yaml` (build + htmltest)
- **Dependabot**: `.github/dependabot.yml` auto-updates GitHub Actions versions weekly
- Both workflows pin Hugo v0.160.1 extended
- Builds with `--gc --minify` flags

### Image Workflow
All images are served as WebP. The render hook at `layouts/_default/_markup/render-image.html` adds `loading="lazy"` to markdown images.

**Adding a new image:**
1. Place the original PNG/JPG in `static/images/`
2. Convert to WebP: `make compress-image src=static/images/myimage.png`
3. Remove the original PNG/JPG (only keep the `.webp`)
4. Reference in markdown: `![alt text](/images/myimage.webp)`

**Exception:** `banner.png` in `static/` is kept as PNG for Open Graph compatibility (social platforms).

### Post Series
Posts can be grouped into a series using the `series` front matter field:
```yaml
series: ["My Series Name"]
```
The series navigation partial renders automatically at the top and bottom of each post in the series, showing an ordered list of all posts in that series.

### Structured Data
JSON-LD `BlogPosting` schema is automatically injected into all post pages via `layouts/partials/docs/inject/head.html`.

## Important Notes

- Hugo version should match production (0.160.1 extended) to avoid build discrepancies
- Theme is a git submodule — when checking out, use `git submodule update --init --recursive`
- Images should be WebP format in `static/images/` (see Image Workflow above)
- The site uses the hugo-book theme but customizes it minimally — check theme documentation when modifying layouts
