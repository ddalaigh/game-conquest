---
name: add-enemy
description: Add a new enemy to Conquest — the design conversation, then every table the game and tests expect. Use whenever he wants a new enemy, monster, foe, or boss in any world.
---

# Add an enemy

## Design first (with him, in words)

1. Name, which world, and the one sentence that makes it different — every enemy
   here has exactly one idea (drifts lanes, splits on death, only flame hurts it,
   shells the back line). If the new one has two ideas, that's two enemies.
2. Pick hp and speed **by comparison**: show him that world's roster with stats
   and ask where this one sits. Fast is ~20+, a wall-breaker is 400+.
3. Let him write the almanac `note` — the game's voice: declarative, wry,
   no exclamation marks, and it should teach the counter without spoiling.

## The rows (the tables test knows these places)

- `FOES` entry — `name, world, hp, speed, art, tag, note`, plus its one behavior
  (`drift`, `arrow`, `cannon`, `splits`, `digs`, `fireOnly`, `fireImmune`,
  `boss`+`phases`…). Copy the nearest existing enemy and change what differs.
- `ART` entry — inline SVG, `viewBox='0 0 40 40'`, built like its neighbors,
  using its world's palette.
- Exactly **one** roster: `CAVE_FOE_ORDER`, `SKY_FOE_ORDER`, or `DEEP_FOE_ORDER`.
- At least one wave: a level `mix`, `rare`, or a boss `pool`. Introduce it in a
  level of its own before any level leans on it — the `curve` suite enforces
  intro-before-heavy.
- Optional: a `<div class="lore hidden" data-foe="...">` block in the rules
  panel. It stays shut until one has been killed; write it accordingly.

## Prove it

- `./test/run.sh` — `tables` catches missed rows, `curve` catches balance shape,
  `winnable` simulates the levels it appears in.
- Spawn it in the sandbox (every world's shelf lists all enemies) and watch it
  do its one thing. Screenshot for him if he's not watching.

Teaching beat, once: one enemy = one row in five places, and the test suite is
the list of places — that's why we keep data out of code.
