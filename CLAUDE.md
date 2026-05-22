# CLAUDE.md

This is a personal blog hosted at https://holosam.dev/, built using Hugo.

## Relevant files
- `content/_index.md` - homepage
- `content/posts/` - all content
- `IDEAS.md` - staging ground for new posts
- `Makefile` - common commands

## Branding

Although the author's real name is used on the site, the main brand of the site should stay centered around Holosam (hologram of Sam). I'm still a bit shy about posting things so I prefer feeling like there's a separate persona that I can post under.

## Posts

### Conventions
- **Length** - a few hundred words with little padding.
- **Footnotes** (Hugo native `[^1]` syntax) - for tangents, citations, and caveats.
- **External references** - prefer primary sources, inline-linked.

### Editorial reviews
Flag honest critiques by line number:
- **Editorial** - structure / story flow makes sense, would anything be embarrassing to present to a technical audience
- **Content** - factual accuracy, voice consistency, any other concerns you spot
- **Copy issues** - typos, redundancies, structure

Use existing posts as canonical reference for voice. Audience is technical.

### Visuals

- **Images** in markdown - stored in `static/images/` as webp (use `make compress` on pngs). Make sure they're sized properly relative to text
- **Mockups** - generate mockups as html files in /tmp so I can view in my browser

## Getting a branch ready for PR

I will test the changes locally using `make serve`.

Make sure we run through this checklist before merging:
- **Libraries** - `brew update` and `brew upgrade` to make sure everything is on the latest version.
  - Update pinned Hugo version
  - Check if the `hugo-book` theme submodule needs to be updated `git submodule update --init --recursive`
- **Build** - PRs execute `hugo_test_build.yaml`, so make sure these checks pass
  - Double check pages render correctly. Custom layouts for home page, posts, head, etc override the theme
