# CLAUDE.md

This is a personal blog hosted at https://holosam.dev/, built using Hugo.

## Relevant files
- `content/_index.md` - homepage
- `content/posts/` - all content
- `IDEAS.md` - staging ground for new posts
- `Makefile` - common commands

### Conventions
- **Length** a few hundred words with little padding.
- **Footnotes** (Hugo native `[^1]` syntax) for tangents, citations, and caveats.
- **External references**: prefer primary sources, inline-linked.
- **Image** needed for the OG image - WebP in `static/images/`.

### Editorial reviews
Flag honest critiques by line number:
- Content: factual accuracy, voice inconsistency
- Copy issues: typos, redundancies, huge structure
- Any other concerns

Use existing posts as canonical reference for voice. Audience is technical.

## Getting a branch ready for PR

Checklist:
- **Libraries**: `brew update` and `brew upgrade` to make sure everything is on the latest version.
  - Update pinned Hugo version
  - Check if the `hugo-book` theme submodule needs to be updated `git submodule update --init --recursive`
- **Build** PRs execute `hugo_test_build.yaml`, so make sure these checks pass
  - Double check pages render correctly. Custom layouts for home page, posts, head, etc override the theme
- **Images** - make sure images are webp (see `Makefile`). Except for static/banner.png for OG compatibility
