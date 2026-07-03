# Blossom

Blossom is a daily word game about linking words to fill a board.

It's served purely as a static site with local browser storage.

## Relevant source

- `assets/blossom/` - (this directory) core source code and word banks
- `content/games/` - url for accessing the game on the site
- `content/posts/blossom.md` - my post describing the history of the game
- `layouts/shortcodes/blossom-scripts.html` - loads this JS (see "Serving" below)
- `scripts/` - one-off tools relating to word banks and game simulation
- `static/css/` - style

## Philosophy

- This is just for fun! If people want to play every day and work on their streak, great. If someone finds it fun to edit their local browser storage to jack up their streak, that's also great.

## Learnings

From speaking to initial players
- >90% mobile only
- Casual players (most people) just play till they fill the board. targetWords is meant as a goal for more hardcore players.
- Players say things like "today's game was really fun/hard", meaning that having one canonical game per day is important (rather than easy/med/hard)
