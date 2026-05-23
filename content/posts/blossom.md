---
title: "Blossom"
date: 2026-05-17T13:42:12-07:00
description: "A daily puzzle game about linking words."
tags: ["projects"]
image: "images/blossom.webp"
---

[Play Blossom here.](/games/blossom/)

<!--more-->

## Background

My mom and I have always shared an appreciation for word games like Words with Friends in its heyday, and more recently the New York Times games. For Christmas 2023, I wanted to create a daily word game for her, and sent her the URL for Blossom.

This original cloud-hosted version[^1] went into disrepair, so this post represents both a relaunch of the game and a bit of a retrospective on how it turned out.

The concept for Blossom grew out of my frustrations with [NYT's Letter Boxed](https://www.nytimes.com/puzzles/letter-boxed). I liked their concept, but the options for the next letter to pick are _not_ adjacent to the letter you just picked, which always hurt my brain. Unlike with [Spelling Bee](https://www.nytimes.com/puzzles/spelling-bee), I never felt like I could get into a flow with Letter Boxed.

![In progress game of Letter Boxed](/images/letter_boxed.webp "Letter Boxed")

So that was the main idea: design a game around the core mechanic of character-linking, but the next options should be adjacent to the current letter.[^2]

## Mechanics

The Blossom game board is a grid of hexagonal tiles that are newly generated each day. Given a starting letter, you tap adjacent tiles to spell words, where the last letter of one word is the start of the next. The goal is to fill the entire board. Letters can be reused both within the same word and across different words.

![In progress game of Blossom](/images/blossom.webp "Blossom")

You're scored by how many words it takes to fill the board, aiming for the lowest score possible. The target score is usually only achievable by linking together the words that were used to create the game board.

New words are randomly selected each day to generate the game board. Tiles follow a few specific rules for how they get placed to make sure the game board isn't a single snake of letters (which also means anyone willing to peek at the [source code](https://github.com/holosam/holosam.github.io) for the game may get a hint for solving the puzzle).

I personally find it pretty difficult to see the solution right away, so there are a couple different ways I enjoy playing:
1. **Wander** - enter any words that you see, taking as many turns as necessary to fill out the whole board. This helps create a bit of a mental model for what consonants and vowels are chainable.
2. **Bird's-eye** - look at the entire board first and see if you can spot words further away from the starting tile. If you have a good word to aim for, that "shrinks" the search space so you only have to get from the starting letter to that target word.

## Game Design

During the design process for the game, I gained a further appreciation for the elegance of NYT daily word games. Specifically:
1. Balancing between creating a real challenge that's rewarding to finish without making it frustrating.
2. A scoring system that rewards effort linearly. It shouldn't be all or nothing, but there's a clear goal to aim for.
3. An application that fits neatly on a mobile screen, with a standardized and familiar pattern.

On these dimensions, I would grade myself:
1. **Balance: 2/5.** The randomness in the word generation creates very different levels of difficulty per day and doesn't always strike the right balance. I feel it's often too challenging to make incremental progress at the beginning, and instead depends on you making a breakthrough to find the "right" answer (the words used to generate the board). So it doesn't reward casual gameplay very well.
2. **Scoring: 3/5.** I like that the scoring method gives you incrementally better scores with fewer words, which encourages retrying for an even better score as you gather more information. But even before filling the board, it would be nice to still reward partial completion, like [Connections](https://www.nytimes.com/games/connections) does.
3. **Pattern: 4/5.** The feel of the game is consistent day over day, but I docked myself a point because the randomness in the board can make it render differently on certain screen sizes, and the design/palette could better focus the eye on current letter options.

## Future Ideas

This post and relaunch are just meant as a checkpoint for the game, but I have some ideas for improvements going forward.

The main opportunity for improvement is how the game board is generated each day. In addition to the balance dimension I mentioned above, I would like to fix some corner case bugs that break the scoring. For example, generating a board with the word chain ["especially", "yes", "special"] means that the target score will be 3 but it's solvable in 1.

Honestly, I believe a dedicated editor selecting words and laying out a pattern every day would make the game far more delightful. This is likely the main answer to improving all three design scores above - a human touch.[^3] I had an interesting idea to try a Monte Carlo search to simulate thousands of potential game boards, score the quality of each, and pick the best for the game that day. But even that requires the "human touch" of knowing what a really good game feels like.

Aside from that, I'd want to see how other people like the game and what frustrations or ideas they have. Nearly every successful game has a story of hours of beta testers and updates from user feedback. If you've got any thoughts, let me know!

## Changelog

- May 18th - added a hint button, updated dictionary to tune difficulty, adaptive window sizing
- May 19th - changed deselect button to delete, more scoring dimensions, share button
- May 22nd - added win streak, tuned game generation, removed unlimited hints

[^1]: The game was originally hosted on a cloud provider with a persistent backend so she could view aggregated stats over time. This is now just on a static site with my other projects, more as a demo than anything else.

[^2]: NYT may have agreed with this take, since they released [Strands](https://www.nytimes.com/games/strands) a few months later with a similar mechanic.

[^3]: NYT swears by this as the reason why their games are so successful, which is discussed on this [Freakonomics podcast episode](https://freakonomics.com/podcast/has-the-new-york-times-become-a-games-company/). Listening to this episode also served as the nudge I needed to make this post.
