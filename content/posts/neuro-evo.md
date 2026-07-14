---
title: "NEAT Topology Crossover via \"Conglomerate\" Network"
date: 2025-03-04T08:00:00-07:00
description: "Proposing a new method for gene crossover."
tags: ["projects"]
featured: true
image: "images/mario_neat_screenshot.webp"
aliases:
  - /posts/neuro_evo/
---

A proposal for a tweak to NEAT's genome crossover: overlay genes on a "conglomerate" network, which is a superset of all network topologies.

<!--more-->

## Background

I first got interested in the concept of [NEAT](https://en.wikipedia.org/wiki/Neuroevolution_of_augmenting_topologies) a few years ago after watching [MarI/O](https://www.youtube.com/watch?v=qv6UVOQ0F44) by creator SethBling, where Mario is controlled by an AI, implemented as an evolving set of "neurons" that watch his environment to trigger button presses such as running and jumping.

The concept of genetic evolution hooked me because I loved the concept of finding solutions that people would never try, like [NASA's Evolved Antenna](https://en.wikipedia.org/wiki/Evolved_antenna), so I took a couple days off work to hack on a [project](https://github.com/holosam/neuro-evo) with the goal of applying a version of this method from scratch to a more generic set of problems. I tried training this type of AI to play Tic Tac Toe and play a Prisoner's Dilemma simulation[^1] against each other.

It doesn't work... yet?

But either way, I got a bit stuck on the implementation of genetic crossover to generate offspring so I wanted to dive into that a bit here.

## (Existing) Global Innovation Numbers

In the original paper [Evolving Neural Networks through Augmenting Topologies](https://nn.cs.utexas.edu/downloads/papers/stanley.ec02.pdf), there's an example of how two genomes create offspring by lining up gene innovation numbers. The innovation number is a global counter, meaning a new gene is given the next sequential number when it first appears, and if that same mutation crops up again within the same generation, it reuses the same number. So two genes that share an innovation number share a historical origin and get lined up, even if the two genomes have otherwise diverged. When one genome has a gene the other lacks, it's considered disjoint (or excess, if it's beyond the range of the other genome's innovation numbers).

The example here from the paper shows how genomes with disjoint genes can create offspring:

![Two genomes generate offspring by lining up innovation numbers](/images/genetic_breeding.webp "Genetic Breeding")

## (New) Conglomerate Idea

Instead of mutating individual genomes and giving each new gene an innovation number, [my implementation](https://github.com/holosam/neuro-evo/blob/c3ea6116c2f77b8780894cbdd6284be34bb1770e/neuron/brain.go#L204) mutated one single, giant network. Then, every individual genome has a small random chance of receiving that gene in that round.

The outcome of this method is that regardless of which two genomes generate offspring, they can always be overlaid on the Conglomerate network. This was a more straightforward implementation to handle disjoint genes and generate the offspring topology:

![Two genomes generate offspring by lining up topologies](/images/conglomerate_breeding.webp "Conglomerate Breeding")

## Takeaways

Maybe there's something promising here, maybe not. There's a lot more experimentation to do to test the viability, so I just wanted to write this post as a summary / checkpoint of the project in case I ever want to pick it up again.

[^1]: The [prisoner's dilemma simulation "game"](https://ncase.me/trust/) that inspired this idea.
