# CLAUDE.md

This is a personal blog hosted at https://holosam.dev/

## Writing and content

Relevant files:
- `content/_index.md` is the homepage
- `content/posts/` has all the posts and are a good reference for my voice and conventions
- `IDEAS.md` is the staging ground

### Conventions
- **Length** a few hundred words with little padding.
- **Footnotes** (Hugo native `[^1]` syntax) for tangents, citations, and caveats.
- **External references**: prefer primary sources, inline-linked.
- **Image** needed for the OG image - WebP in `static/images/`.

### Front matter

```yaml
---
title: "Post Title"
date: 2026-01-11T08:00:00-07:00
description: "Short description (shown on home page and SEO)"
tags: ["psychology"]
image: "images/relevant-image.webp"   # optional, relative to static/
series: ["Series Name"]            # optional
---
```

### Editorial reviews
Flag honest critiques by line number:
- Content: factual accuracy, voice inconsistency
- Copy issues: typos, redundancies, huge structure
- Any other concerns

Use existing posts as canonical reference for voice. Audience is technical.

## Hugo / build details

Read the relevant files when you need more.

### Common commands
```bash
make serve            # dev server with drafts
make build            # production build (--gc --minify)
make new-post name=x  # scaffold content/posts/x.md
make compress-image src=static/images/foo.png   # convert to WebP
make compress-all     # batch convert PNG/JPG in static/images/
```

Required tools: Hugo extended (`brew install hugo`), `cwebp` (`brew install webp`).

### Image workflow
All post images are WebP. Drop the original PNG/JPG in `static/images/`, run `make compress-image src=...`, delete the original, reference as `![alt](/images/foo.webp)`. The render hook at `layouts/_default/_markup/render-image.html` adds `loading="lazy"` automatically.

Exception: `static/banner.png` stays PNG for Open Graph compatibility.

### Series
`series: ["Name"]` in front matter groups posts. The partial at `layouts/partials/series-nav.html` renders prev/next nav at the top and bottom of each post in the series.

### Gotchas
- Hugo version is pinned to **0.160.1 extended** in CI for now - match locally or builds may diverge.
- Theme `themes/hugo-book/` is a git submodule - after cloning or switching branches, run `git submodule update --init --recursive`.
- `unsafe: true` markup is enabled, so inline HTML in markdown works.
- Custom layouts override the theme: home page (`layouts/index.html`), post layout (`layouts/posts/single.html`), head injection (`layouts/partials/docs/inject/head.html` - OG image + JSON-LD).

### Deployment
PRs run `hugo_test_build.yaml` (build + htmltest link check). Then merge to `main` → `.github/workflows/hugo_deploy.yaml` deploys to GitHub Pages.
