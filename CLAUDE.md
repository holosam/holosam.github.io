# CLAUDE.md

This is a personal blog hosted at https://holosam.dev/, built using Hugo.

## Relevant files
- `content/_index.md` - homepage
- `content/posts/` - all content
- `assets/js` - source code for games (served via Hugo's fingerprint pipeline)
- `Makefile` - common commands

## Branding

Although the author's real name is used on the site, the main brand should stay centered around Holosam (hologram of Sam). I'm still a bit shy about posting things so I prefer feeling like there's a separate persona that I can post under.

## Posts

**Conventions**
- Length - a few hundred words with little padding
- Footnotes (Hugo native `[^1]` syntax) - for tangents, citations, and caveats
- External references - prefer primary sources linked inline

**Editorial reviews**
Looking for honest critiques. Flag by line number:
- Editorial - structure / story flow makes sense, would anything be embarrassing to present to a technical audience
- Content - factual accuracy, voice consistency, any other concerns you spot
- Copy issues - typos, redundancies, structure
Audience is technical. Use existing posts as canonical reference for voice.

**Visuals**
- Images in markdown - stored in `static/images/` as webp (use `make compress` on pngs). Make sure they're sized properly relative to text
- Mockups - generate mockups as html files in /tmp so I can view in my browser

## Coding

- Just because something is there already it doesn't mean it was extremely well thought-out. Think critically and question assumptions
- Start with proposing the simplest option (low effort, high impact) and we can discuss adding complexity incrementally from there
- Comments are not needed when code is self-explanatory. Comments should be used to remember counter-intuitive decisions

## Getting a branch ready for PR

I will test the changes locally using `make serve` and do the git operations.

Make sure we run through this checklist before merging:
- **Libraries** - `brew update` and `brew upgrade` to make sure everything is on the latest version. If applicable:
  - Update pinned Hugo version
  - Check if the `hugo-book` theme submodule needs to be updated `git submodule update --init --recursive`
- **Build** - PRs execute `hugo_test_build.yaml`, so make sure these checks pass
  - Double check pages render correctly. Custom layouts for home page, posts, head, etc override the theme
