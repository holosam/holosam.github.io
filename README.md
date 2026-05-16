# holosam.dev

Personal blog at <https://holosam.dev/>, built with Hugo + the [hugo-book](https://github.com/alex-shpak/hugo-book) theme and deployed to GitHub Pages.

## Local development

```sh
make serve     # hugo server with drafts enabled
make build     # production build (--gc --minify)
make help      # list all targets
```

Requires Hugo extended (`brew install hugo`) and `cwebp` (`brew install webp`).

After cloning, pull the theme submodule:

```sh
git submodule update --init --recursive
```

## Adding a new post

```sh
make new-post name=my-new-post
```

Then edit `content/posts/my-new-post.md`. Front matter:

```yaml
---
title: "Post Title"
date: 2026-01-11T08:00:00-07:00
description: "Short description for SEO and previews"
tags: ["tag1"]
image: "images/relevant-image.webp"  # optional, relative to static/
series: ["Series Name"]              # optional
---
```

Use `<!--more-->` to mark where the home-page excerpt ends.

## Adding images

All images are served as WebP.

```sh
# put the original PNG/JPG in static/images/, then:
make compress-image src=static/images/myimage.png
# remove the original; reference the .webp in markdown:
# ![alt text](/images/myimage.webp)
```

`make compress-all` converts every PNG/JPG in `static/images/` in one shot.

## Deploying

Pushes to `main` deploy automatically via `.github/workflows/hugo_deploy.yaml`. Pull requests run `.github/workflows/hugo_test_build.yaml` (build + htmltest).
