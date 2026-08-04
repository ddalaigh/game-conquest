---
name: add-world
description: Add a whole new world to Conquest — the design questions, the WORLDS row, screen, theme, music, carrier, gating, and the slice-by-slice build order the Deep Sea used. Use for "new world", "world four", "a lava/space/forest world".
---

# Add a world

This is the biggest thing the game knows how to grow. It is days of sessions,
not one — say that up front, kindly, and then start, because the Deep Sea
proved the path works.

## The two design questions (before any code)

1. **What does holding a square cost here?** Each world has one tax: the Caves
   give ground away free; the Sky makes flightless creatures ride a Flatbird;
   the Deep makes everything live in a bubble a crocodile leaves behind. The
   new world needs its own answer — and its `holdsAlone()` rule and (usually)
   a free carrier mythic to pay the tax with. The `tables` suite *requires*
   every no-ground world to have a free, capped carrier.
2. **What walks its lanes?** Three or four enemies that only make sense here,
   each with one idea. Design them with `/add-enemy` later; name them now.

## The build order (one slice per session, tests green after each)

1. **The door, shut.** DEV backdoor button + `<world>WorldOpen(){ ... || true }`
   with removal comments — copy the `deepDoor` pattern exactly. The world hides
   behind it until it's real.
2. **The `WORLDS` row** (`levels, word, key, box, track, screen, grid`,
   `noGround`, `carrier`) plus the screen HTML (card, box art, level grid,
   rules panel, bondbar) and the CSS theme. The HUD prefix and lose text come
   free from `W()`.
3. **The tax.** Carrier creature + `holdsAlone()` + `canPlace` reason codes with
   messages in this world's words (the trench message is `trenchMsg()` — extend
   it). New codes get `reasons` tests.
4. **Enemies** (`/add-enemy` each) and a `<WORLD>_FOE_ORDER` roster + almanac
   section in `almEnemies`.
5. **Levels** (`/add-level` each) — the `curve` and `winnable` suites pick the
   new table up the moment it's in `WORLDS`.
6. **Music** — a track in the `TRACKS` table; slower/faster, but built like its
   neighbors.
7. **The real gate.** Decide with him what earns entry (the Deep opens off the
   Thunderhead), wire it, and only then delete the DEV door — the comments say
   how.

## Keep whole

Picker carrier line, sandbox shelf, almanac rosters, and the end-screen text all
key off tables — if a test isn't failing and the screens look right, you got
them. The `winnable` suite is the last word: every level of the new world must
resolve and must fall undefended.
