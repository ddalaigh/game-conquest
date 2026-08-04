/* The Blower turns arrows, the Gale turns airship shells, and neither does the
 * other's job. Four cases that previously cost four rounds of clicking. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

const ARROW_DMG = 20;
const SHELL_DMG = 50;

function board() {
  const g = boot();
  for (const k of ["blowertortoise", "galetortoise", "forge"]) g.meta.unlocked[k] = 1;
  g.startLevel("caves", 1, false);
  g.setEnergy(9999);
  g.clearCooldowns();
  return g;
}

function put(g, key, r, c) {
  g.clearCooldowns();
  g.select(key);
  g.click(r, c);
  return g.state().grid[r][c].unit;
}

/* run the projectile list until it settles, with an explicit clock */
function settle(g, frames = 200) {
  for (let i = 0; i < frames; i++) g.tickArrows(16);
}

function liveArrows(g) { return g.state().arrows; }

test("an arrow is turned back by a Blower Tortoise", () => {
  const g = board();
  const row = 2, col = 4;
  const wall = put(g, "blowertortoise", row, col);
  assert.ok(wall, "could not place the wall");
  const hp0 = wall.hp;

  g.makeArrow(row, g.midX(col) + 60, ARROW_DMG);
  const shot = liveArrows(g)[liveArrows(g).length - 1];

  for (let i = 0; i < 60 && !shot.back; i++) g.tickArrows(16);

  assert.equal(shot.back, true, "the arrow was not turned");
  assert.equal(wall.hp, hp0, "the wall took damage from an arrow it should have turned");
});

test("a shell passes straight over a Blower Tortoise", () => {
  const g = board();
  const row = 1, wallCol = 4, backCol = 1;
  put(g, "blowertortoise", row, wallCol);
  const behind = put(g, "forge", row, backCol);
  assert.ok(behind, "could not place the back line");
  const hp0 = behind.hp;

  g.makeShell(row, g.midX(wallCol) + 80, SHELL_DMG, g.midX(backCol));
  const shell = liveArrows(g)[liveArrows(g).length - 1];
  settle(g);

  assert.notEqual(shell.back, true, "the Blower turned a shell, which is the Gale's job");
  assert.equal(behind.hp, hp0 - SHELL_DMG, "the shell did not land on the back line");
});

test("a shell is turned back by a Gale Tortoise", () => {
  const g = board();
  const row = 3, wallCol = 4, backCol = 1;
  put(g, "galetortoise", row, wallCol);
  const behind = put(g, "forge", row, backCol);
  const hp0 = behind.hp;

  g.makeShell(row, g.midX(wallCol) + 80, SHELL_DMG, g.midX(backCol));
  const shell = liveArrows(g)[liveArrows(g).length - 1];

  for (let i = 0; i < 60 && !shell.back; i++) g.tickArrows(16);

  assert.equal(shell.back, true, "the Gale did not turn the shell");
  assert.equal(behind.hp, hp0, "the back line was hit anyway");
});

test("an arrow goes straight through a Gale Tortoise", () => {
  const g = board();
  const row = 0, col = 4;
  const wall = put(g, "galetortoise", row, col);
  const hp0 = wall.hp;

  g.makeArrow(row, g.midX(col) + 60, ARROW_DMG);
  const shot = liveArrows(g)[liveArrows(g).length - 1];
  settle(g);

  assert.notEqual(shot.back, true, "the Gale turned an arrow, which is the Blower's job");
  assert.equal(wall.hp, hp0 - ARROW_DMG, "the arrow did not land");
});

test("a turned shot carries its damage into the enemy that fired it", () => {
  const g = board();
  const row = 2, col = 4;
  put(g, "blowertortoise", row, col);
  const foe = g.spawnFoe("archer", row, g.midX(col) + 120);
  const hp0 = foe.hp;

  g.makeArrow(row, g.midX(col) + 60, ARROW_DMG);
  settle(g);

  assert.equal(foe.hp, hp0 - ARROW_DMG, "the returned arrow did not hit the archer");
});

test("a turned shot leaves the board rather than lingering", () => {
  const g = board();
  const row = 4, col = 4;
  put(g, "blowertortoise", row, col);
  g.makeArrow(row, g.midX(col) + 60, ARROW_DMG);
  settle(g, 400);
  assert.equal(liveArrows(g).length, 0, "a returned arrow is still in flight");
});
