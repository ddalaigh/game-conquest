# Conquest

A lane-defence game in a single HTML file. No build step, no dependencies, no server — open `index.html` in a browser and play.

## Play

```bash
open index.html
```

## What it is

You hold a keep on the left of a 6×5 board while waves come in from the right. Energy trickles in from the keep and from forges you place; you spend it projecting creatures onto the grid.

- **Two worlds.** The Caves (15 levels) and the Sky (17 levels). Sky levels are fought on a daylit board against flying enemies, with open lanes that ground units can't hold.
- **35 creatures** across five families — forge, dragon, guardian, winged, support — plus fusion upgrades (twin forges, four-headed drakes, wide phoenixes).
- **Items and mythics** unlock at fixed levels and change what the rest of the run looks like.
- **Per-family unlocks and purchasable upgrades** raise creature tiers and projection caps.
- **A sandbox mode** with no projection caps, bounded only by the size of the board.
- Sound is synthesised in-browser via the Web Audio API — no audio files.

Enemies escalate deliberately: shielded skeletons take 200, armoured take 400, goblins run twice as fast and arrive in mobs, diggers burrow past your line and leave a hole open behind them. Each level carries a note explaining what it's testing.

## Tests

```bash
./test/run.sh
```

No install step and no dependencies — not even a `node_modules`. The harness reads
`index.html`, pulls out the game's `<script>`, and runs it against a small DOM
written for the purpose (`test/dom.mjs`), with `Math.random` seeded and time
injected. A whole run takes about five seconds, nearly all of it the `winnable`
suite playing entire levels out; everything else finishes in well under a second.

The game exposes a single test seam at the bottom of the IIFE, guarded by
`window.__CONQUEST_TEST__`, so the shipped file is still one file you can open by
double-clicking. Tests assert on the game's own state — the grid, the enemy list,
energy — never on rendered output, which is why the stub DOM can stay small.

Three seams in the game make this work:

- **`step(ms)`** runs one loop iteration with an explicit `dt` instead of waiting
  on `requestAnimationFrame`, so a test for something that happens after 700ms
  costs microseconds and gives the same answer every run.
- **`canPlace(k, r, c)`** decides whether a square will take a creature and
  returns a reason code when it won't — `cooldown`, `noBubble`, `cap`,
  `notRunning`. `clickCell` is the thin wrapper that does the DOM and the sound.
  Without this, every refusal looks identical from outside: no creature appeared.
- **`setRng(fn)`** and **`outcome()`** pin the randomness and expose how the last
  level ended, which together make whole levels simulatable headlessly.

| Suite | Covers |
| --- | --- |
| `tables` | Data invariants — waves name real enemies of their own world, art exists, rosters are complete |
| `placement` | Who can stand where in each world, including the Deep's bubble lifecycle |
| `reasons` | Every refusal path, by code |
| `lore` | The spoiler gates — a rules-panel block stays shut until its enemy has been put down |
| `combat` | The Blower/Gale × arrow/shell reflection matrix |
| `curve` | The difficulty climb, checked statically against the wave tables |
| `winnable` | Whole levels simulated to a conclusion; determinism; an undefended keep always falls |

## Notes

Progress isn't persisted — there's no save state, so a session lasts as long as the tab does. The only external dependency is Google Fonts (Eczar and Outfit); without a network connection it falls back to system fonts and plays fine.
