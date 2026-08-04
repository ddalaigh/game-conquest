---
name: add-level
description: Add or rebalance a level in any world — wave design inside the curve suite's promises, trenches, notes, and the simulation tests. Use for "add a level", "make level N harder/easier", or new boss levels.
---

# Add a level

## Design first (with him, in words)

A level is one question asked politely: *what does this wave test that the one
before it didn't?* Get that answer in a sentence before touching the table.

## The row

Levels live in `LEVELS` / `SKY_LEVELS` / `DEEP_LEVELS`, keyed by number:

- `count` — how many enemies. `gap` — ms between arrivals.
- `mix` — draw pool. Repeating a kind weights it (two `nipper` + one
  `driftjelly` = mostly crabs).
- `gaps` — trench squares `[row, col]`. Never a whole lane (tested); trenches
  cut shapes, they don't delete lanes.
- `note` — his to write. It appears at the start of the level and should teach
  the wave's question without solving it.
- Boss levels: `boss:true` (+ `bossKind`), few adds, slow gap — the boss *is*
  the content, and the `curve` suite checks a boss level is built that way.

## The promises (the `curve` suite is a net, on purpose)

Within a world, non-boss levels promise: counts never shrink, gaps never grow,
no health cliff over 2.5×, an enemy appears before it dominates a mix, spawning
lasts 20s–300s, and world openers stay gentle. If the new level breaks one, stop
and put the choice to him: change the level, or change the promise — both are
legitimate, and *that conversation is the skill being taught*. Change a promise
in `curve.test.mjs` deliberately and say so in the commit.

## Prove it

- `./test/run.sh` — `winnable` already simulates the new level headlessly: it
  must resolve, and it must fall when undefended.
- Then the only test that matters: play it. Is the new question fun to answer?
  Watch him play it if he's there; play it yourself if not and report what a
  player would feel.
