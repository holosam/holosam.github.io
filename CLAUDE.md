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

## Browser games

Games live at `/games/<slug>/`. Pattern is plain client-side JS, no build step:

- **Page**: `content/games/<slug>.md` with a `<div id="…"></div>` and one or more `<script src="/js/…">` tags. Front matter is normal post-style.
- **Logic**: `static/js/<slug>.js`, IIFE-wrapped. Hugo serves `static/` files as-is — no processing.
- **Layout**: `layouts/games/baseof.html` strips theme chrome (no sidebar, simplified header) for anything under `content/games/`.
- **Styles**: shared `static/css/games.css`. Prefix per-game classes (`bl-` for Blossom) to keep games isolated.
- **Daily seed**: hash the local date to seed an RNG (mulberry32 works well). Persist progress to `localStorage` keyed by `<game>-YYYY-MM-DD`.
- **Word lists**: big dictionaries (>100KB) ship as their own `<script>` that defines a global. `/usr/share/dict/web2` is OK for some root-words but is missing inflections like `began`/`runs`/`played` — use [dwyl/english-words `words_alpha.txt`](https://github.com/dwyl/english-words) for validation. Two-list pattern works well: a **broad validation list** (so players can try anything reasonable) plus a **narrow curated generation list** (so daily boards are made of words real humans recognize). Blossom's curated bank lives at `assets/blossom/word_bank.txt`; `make blossom-words` regenerates `static/js/blossom-words.js`.
- **Sharing logic with Node CLIs**: wrap generators in a UMD-style `(function(root){…})(typeof window !== 'undefined' ? window : globalThis)` and export via `module.exports` if it exists. A Node script in `scripts/` can then `require()` the same module the browser uses — see `static/js/blossom-gen.js` and `scripts/blossom-solve.js`.
- **TypeScript**: not used. Hugo can run TS through `js.Build` (esbuild) but it needs sources in `assets/` and a resource-pipeline partial. For one-file games the overhead isn't worth it; JSDoc gives type-checking without the build step.
