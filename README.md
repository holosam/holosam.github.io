### Local Development

```sh
hugo server
```

Site will be available at [localhost:1313](http://localhost:1313)

## Common Tasks

### Adding a New Post

1. Create a new markdown file in `content/posts/`:

```sh
hugo new content/posts/my-new-post.md
```

1. Add content:

```yaml
---
title: "Your Post Title"
date: 2026-01-11T08:00:00-07:00
description: "Short description for SEO and previews"
tags: ["tag1", "tag2"]
image: "images/relevant-image.png"  # Optional, relative to static/
---

Summarized excerpt here.

<!--more-->

Rest of the post...
```

1. Add images to `static/images/`

### Deploying

Deployment is automatic from `main` branch. To manually test the production build:

```sh
hugo --minify
```
