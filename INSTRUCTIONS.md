# Spec for Blossom, a word game

## Brief

Blossom is a word game, similar to a NYT word game like Wordle. The core gameplay involves a game board of connected hexagons containing single letters, where the player selects letters from adjacent tiles to spell out words to use up all the tiles.

## Task

Your task is to implement Blossom as an (ideally typescript) game on this website.

### Way of working

1. Start with plan mode - gather context and make sure you understand the entirety of the task. And also just understand the feel of the game.
2. Implement - I trust you with a comprehensive implementation of the game. I would rather iterate on a working demo rather than having to imagine pieces, so if there are tradeoffs to be made, go ahead and choose one and then we can discuss later
  - I prefer simple, clean code. For example, if building a UI element would be 50 lines of code to exactly match the screenshot vs. 10 lines of code to get close enough with a more common component, choose the shorter one
3. Iterate - together we'll run through the demo and tweak aspects of the game

## Resources

- Screenshots - pasted into the terminal prompt. These are from a couple years ago when I was ideating on the game, which have a nice aesthetic that I was aiming for but never got around to implementing
- Blossom v0 files in `tmp_blossom/` - 2 years ago attempt at implementing, using a python backend
- Wordle placeholder - unstaged git changes show where/how to host javascript games on the site

Guidance when accessing these resources: the screenshots are the most canonical design, so this is closest to what the game should look like. For the existing Blossom v0 files, use these more as inspiration for the taste, feel, nuance of the logic. See what unanswered questions there are about the game to understand the mindset I was in while implementing. The Wordle game here is just meant as an example of how to render the game on this site, but otherwise doesn't hold anything useful.

## Game spec

### Product requirements

This is a personal blog and is a game I want to build for my mom as a Christmas present. So it's more meant to be a demo rather than a full-fledged application with all the bells and whistles. Which means:
- Each day, a new random game should be generated (for users globally - perhaps on the hash of the date string or something?)
- State should be saved if you come back to the game on the same day (I believe the wordle demo does this already)
- But let's not worry about long term stats or sharing or anything that requires a database

I think it's also important for this game to _feel_ good. Like a level of polish that would befit NYT or neal.fun just in the way that it can't be buggy or laggy, and you can kinda get into a flow with it. Similarly, if it could not look absolutely horrible on mobile that would be awesome.


