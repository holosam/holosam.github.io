# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal blog/website built with Hugo (v0.137.1 extended) using the hugo-book theme. The site is deployed to GitHub Pages at https://holosam.github.io/.

## Development Commands

### Local Development
```bash
# Start Hugo development server with drafts
hugo server -D

# Build site locally
hugo

# Build with minification (production-like)
hugo --minify
```

### Testing
The repository has a GitHub Actions workflow that automatically tests builds on pull requests to main (`.github/workflows/hugo_test_build.yaml`).

## Architecture

### Content Structure
- **Posts**: Located in `content/posts/`. Each post is a markdown file with front matter.
- **Home Page**: Custom template at `layouts/index.html` lists recent posts from the posts section.
- **Front Matter**: Posts use YAML front matter with fields:
  - `title`: Post title
  - `date`: Publication date (format: `2025-02-17T08:00:00-07:00`)
  - `description`: Short description
  - `tags`: Array of tag strings
  - `image`: Path relative to `static/` for Open Graph images

### Theme Integration (hugo-book)
- Theme is included as a git submodule in `themes/hugo-book/`
- Custom overrides:
  - `assets/_fonts.scss`: Uses Figtree font family from Google Fonts
  - `layouts/partials/docs/inject/head.html`: Custom Open Graph image tags (defaults to `banner.png` if no image specified in post)
  - `layouts/index.html`: Custom home page layout

### Static Assets
- `static/images/`: Post images and graphics
- `static/banner.png`: Default Open Graph image
- `static/favicon.png`: Site favicon

### Configuration (`hugo.yaml`)
- Base URL: `https://holosam.github.io/`
- Markup: `unsafe: true` to allow inline HTML in markdown
- Menu structure:
  - "Before" section with Posts link
  - "After" section with GitHub and Bluesky links
- Taxonomies: Tag system enabled

### Deployment
- **Auto-deployment**: Pushes to `main` branch trigger `.github/workflows/hugo_deploy.yaml`
- **PR Testing**: Pull requests trigger `.github/workflows/hugo_test_build.yaml` to validate builds
- Uses Hugo Extended v0.137.1 in production
- Builds with `--gc --minify` flags for optimization
- Outputs to `public/` directory which is deployed to GitHub Pages

## Important Notes

- Hugo version should match production (0.137.1 extended) to avoid build discrepancies
- Theme is a git submodule - when checking out, use `git submodule update --init --recursive`
- Images referenced in post front matter should be placed in `static/images/` and referenced as relative paths (e.g., `images/filename.png`)
- The site uses the hugo-book theme but customizes it minimally - check theme documentation when modifying layouts
