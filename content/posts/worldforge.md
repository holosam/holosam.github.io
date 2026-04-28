---
title: "Worldforge"
date: 2026-04-26T20:56:05-07:00
description: "Lore tracker for sci-fi worldbuilding."
tags: ["projects"]
---

I was reading the Red Rising series and imagining the storyboard hell that authors of epic sci-fi and fantasy series must have.

<!--more-->

The amount of world lore, individual character perspectives, deciding what goes in/out, and then writing half the book to realize there's an inconsistency? It's making me feel almost ready to let George R. R. Martin off the hook.

Around the same time, I was hearing about [Kosmos](https://edisonscientific.com/articles/announcing-kosmos) which has a deeply complex agent memory system. I thought it would be fun to try applying this concept by building a side project with the challenge of achieving 100% fidelity for persistence and recall - applied to this subject with relatively little financial upside, which forces it to _stay_ fun.

A couple-thousand-word [gist from Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) did, however, show that you can do a lot of this with way fewer words than I had expected (and no code). So in that spirit, I thought I'd share the version I had worked on, in case it's useful to authors who'd want a more specialized prompt for writing and worldbuilding, and an optional opinionated cast of advisors.

---

Worldforge supports authors through every phase of writing: exploring ideas, building the world, writing pages, and reviewing for tension and consistency.

## Background

Worldbuilding for a sci-fi or fantasy novel can be challenging at scale. Manual management of notes, storyboards, and spreadsheets is tedious. Writers feel pressure to "solve the whole puzzle" before writing because discovering an inconsistency 10,000 words in is devastating. 

Mass-market AI tools are not yet solving this problem. Depending on a single 1M+ token context window in NotebookLM is not enough space, and still suffers from context rot and hallucinations which worsen as the canon grows.

## Product Description

Worldforge actively accepts ideas or questions, and passively reads pages and comments, all of which kick off a swarm of AI agents that discuss and handle the new information while maintaining the author's flow.

Writers will want to share drafts with others to get feedback, sketch out flowcharts or illustrations to visualize their ideas, or record voice notes. It's important to maintain these source docs, so Worldforge is not the storage system itself, but a layer on top that writes and organizes files in a human-accessible way.

This leads to three session modes:
- **Explore** - This is the brainstorming and "what if" mode. Advisors riff freely. Implications and opportunities surface prominently. The system's job is to amplify creativity without interrupting flow: "yes, and..."
- **Build** - Defining and committing. Validation runs on every commit. Implications and opportunities are collapsed/secondary (available but not in your face). Agents speak only when flagged or when a hard conflict is found. The system's job is to get out of your way while protecting consistency.
- **Review** - Show me tensions, run consistency checks, surface what needs attention, ask "what should I work on today?" The system's job is to give you the state of the world.

This maintains the author's feeling of ownership over their IP and keeps them from feeling boxed-in by one mode of working. Some principles along these lines:
- Worldforge speaks the user's language and refers to lore as they've described it. Authors think in "the Age of Expansion," not "Session 14."
- Privacy concerns - users input their own LLM API token, and files stay on their machine (or backed by something like Google Docs).

### The Advisor Swarm

While writing or brainstorming, Worldforge may kick off a number of specialized agents to offer ideas or feedback:

| Agent | Role | Personality Notes |
|-------|------|-------------------|
| **Worldforge** (orchestrator) | Manages flow, reads the room, synthesizes | The facilitator, routes requests to specialized advisors |
| **Historian** | Historical precedents, parallels, cultural patterns | Grounds speculation in real-world examples |
| **Physicist** | Physical laws, engineering constraints, plausibility | Keeps the world structurally sound |
| **Psychologist** | Human behavior, identity, social dynamics, trauma | What does this feel like for the people living it |
| **Economist** | Resources, trade, incentives, power structures | Follows the money and the incentives |
| **Strategist** | Military, political, power dynamics | Thinks in terms of leverage and conflict |
| **Dramatist** | Narrative weight, thematic resonance, story structure | Thinks about the audience |
| **Validator** | Consistency checking, constraint enforcement | Compiles, doesn't criticize |

## Knowledge Bank

This system is meant to be extremely trustworthy and efficient at _any_ scale. Instead of large blobs of data, a structured graph with relationships enables deterministic retrieval and persistence, while avoiding context rot.

An LLM has the responsibility for building a layer of understanding on top of the source files, resulting in a structured graph of summaries and references.

### Structure

- `story/` - actual pages in the book. This is canon.
- `lore/` - facts and ideas about the world itself, structured around entities (e.g. `lore/characters/player_one`, `lore/physics/lightspeed_travel`). Also holds the user's one-off brainstorming and possible branches, without needing to commit to a direction yet.
- `cache/` - the agent's working ground, which stores structured information parsed from source docs. This evolves as new files are entered and as users ask for / input data. Can hold things like summaries, comments, and unresolved questions for easy retrieval.
  - Files should be largely human-readable but colorfully annotated with notes and hyperlinks to each other to make agentic crawling easier.
- `index/` - essentially the table of contents describing how the cache is structured for the agent to reference
  - contains `index/log.md` to log all file entries and queries, acting as a version control.

### Actions

1. **Insert** - new lore or pages enter the system. The advisor swarm discusses and tags the information, a new entity/relationship page is created in `lore/`, backlinks are updated, and validation runs as a triplet:
  - **Inbound check** - does this contradict anything established? (hard conflicts)
  - **Stress test** - what future scenarios does this make impossible or implausible? "You've established X, which means Y will need resolution eventually." (soft constraints)
  - **Implication mining** - what does this imply that hasn't been stated? "If this civilization has had X for 300 years but only done Y, something is suppressing progress - we should address that."

2. **Query** - ask a question about the world. Responses should include a direct reference to a source doc and line number(s). These questions should be logged and answers should be stored in some form in the cache as well. Ask things like:
   - "Give me everything that depends on X" (dependency traversal)
   - "What breaks if I change X?" (impact analysis)
   - "What does this character know about X at this time?" (temporal consistency)

3. **Resolve** - on cadence (nightly?), a full crawl runs the validation triplet to check for conflicts, unanswered questions, and missing links. Surfaces tensions to the author with severity and age.

Authors don't need everything to be perfect. Information should feel fair and consistent with what exists, but some things can and should stay unknown.
