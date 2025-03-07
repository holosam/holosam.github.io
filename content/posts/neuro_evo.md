---
title: "NEAT Topology Crossover via \"Conglomerate\" Network"
date: 2025-03-04T08:00:00-07:00
description: "Proposing a new method for gene crossover."
tags: ["projects"]
image: "images/mario_neat_screenshot.png"
---

A proposal for an improvement on NEAT's global innovation number to line up genes: create a "conglomerate" network which is a superset of all network topologies.

<!--more-->

## Background

I first got interested in the concept of [NEAT](https://en.wikipedia.org/wiki/Neuroevolution_of_augmenting_topologies) a few years ago after watching [MarI/O](https://www.youtube.com/watch?v=qv6UVOQ0F44) by creator Sethbling, where Mario is controlled by an AI, implemented as an evolving set of "neurons" that watch his environment to trigger button presses such as running and jumping.

The concept of genetic evolution hooked me because I loved the concept of finding solutions that people would never try, like [NASA's Evolved Antenna](https://en.wikipedia.org/wiki/Evolved_antenna), so I took a couple days off work to hack on a [project](https://github.com/holosam/neuro-evo) with the goal of applying a version of this method from scratch to a more generic set of problems. I tried training this type of AI to play Tic Tac Toe and play a Prisoner's Dilemma simulation<sup>1</sup> against each other.

It doesn't work... yet?

But either way, I got a bit stuck on the implementation of genetic crossover to generate offspring so I wanted to dive into that a bit here.

## (Existing) Global Innovation Numbers

In the original paper [Evolving Neural Networks through Augmenting Topologies](https://nn.cs.utexas.edu/downloads/papers/stanley.ec02.pdf), there's an example of how two genomes create offspring by lining up gene innovation numbers. The innovation number is just a number assigned when the gene is created, so a node or connection created 5th on one genome will be lined up with the 5th gene created on another. When the topologies are different between two genomes, genes can be considered disjoint.

The example here from the paper shows how genomes with disjoint genes can create offspring:

![Two genomes generate offspring by lining up innovation numbers](/images/genetic_breeding.png "Genetic Breeding")

## (New) Conglomerate Idea

Instead of mutating individual genomes and giving each new gene an innovation number, [my implementation](https://github.com/holosam/neuro-evo/blob/c3ea6116c2f77b8780894cbdd6284be34bb1770e/neuron/brain.go#L204) mutated one single, giant network. Then, every individual genome has a small random chance of receiving that gene in that round.

The outcome of this method is regardless of which two genomes generate offspring, they can always be overlaid on the Congomerate network. This was a more straightforward implementation to handle disjoint genes and generate the offspring topology:

![Two genomes generate offspring by lining up topologies](/images/conglomerate_breeding.png "Conglomerate Breeding")

## Takeaways

Nothing, really. There's a lot more experimentation to do to test the viability of this Conglomerate idea, so I just wanted to write this post as a summary / checkpoint of the project in case I ever want to pick it up again.

<br>
<br>
<br>

## Footnotes

<sup>1</sup> The [prisoner's dilemma simulation "game"](https://ncase.me/trust/) that inspired this idea.
