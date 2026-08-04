---
name: add-creature
description: Add a new creature, fusion, or upgrade to the player's side — tables, art, tray, how it's earned, and tests. Use when he wants a new creature, tower, fusion, upgrade, or mythic.
---

# Add a creature

## Design first (with him, in words)

1. Name, family (`forge / dragon / guardian / support / winged / mythic`), and
   the one job it does. Cost and recharge by comparison with its family —
   show him the family's existing costs and ask where this sits.
2. **How is it earned?** Everything is earned somewhere: bound from the start,
   `LEVEL_CREATURE` (level reward), `RECIPES` (creature + item at the fusion
   table), `PAIR_RECIPES` (creature + creature), an upgrade placed onto its
   base (`from:`), or a mythic granted by a boss (`LEVEL_MYTHIC`/`SKY_MYTHIC`).
   Free things feel cheap — make him choose the price.
3. He writes the blurb. Game voice, no spoilers for unearned content.

## The rows

- `CREATURES` entry — copy the nearest relative. Mind the flags:
  `FLIES` if it flies (this decides Sky placement), `wall`, `shoot`, `gen`,
  `instant` (support, uses per level), `roller`, `carrier`, `onlyIn` for
  world-locked, `cap` for its own projection limit, `boost:{kind}` for what an
  energy boost does to it.
- `ART` entry — inline SVG `viewBox='0 0 40 40'`, family look.
- `ORDER` (tray/picker position) — or `UPGRADE_ORDER` if it's an upgrade.
- Upgrades: `from:` names the base; `ROOT`/caps make it count against the base's
  projection cap. Fusions: `fusedOnly:true` plus the recipe row.
- The almanac writes its own page from these rows — check `creatureStats` output
  reads sensibly (deep-only creatures "swim", flightless say what carries them).

## Prove it

- `./test/run.sh` — `tables` demands art + a tray order for every creature and
  real names in every recipe.
- Sandbox playtest (everything is unlocked there): place it, watch its one job,
  give it a boost and check the boost does something sane.
- If it changes *placement rules* (a new carrier, a new world tax), it needs a
  `canPlace` reason code and a test in `reasons` — that's the pattern the
  Bubble Dial set.

Teaching beat, once: the player's side and the enemy side are the same trick —
rows in tables — but creatures have one extra question, "how is it earned?",
and that question is game design, not code.
