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

## Notes

Progress isn't persisted — there's no save state, so a session lasts as long as the tab does. The only external dependency is Google Fonts (Eczar and Outfit); without a network connection it falls back to system fonts and plays fine.
