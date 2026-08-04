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

/* ---- the Bubble Dancer. It walks in like anything else — always the middle
   lane — stops on the bubble column to dance, and its dark bubbles shield the
   first enemy through each. The Deep's rules are proved in the sandbox, same
   as the placement suite. ---- */

function deepBoard() {
  const g = boot();
  g.startLevel("deep", 1, true);
  return g;
}

/* walk a fresh Dancer in until its dance has ended and the bubbles are down */
function danceOver(g, d) {
  const z = g.spawnFoe("bubbledancer");
  let guard = 0;
  while (!z.danced && guard++ < 900) g.step(100);
  return z;
}

test("the Bubble Dancer walks the middle lane and stops at its tile to dance", () => {
  const g = deepBoard();
  const d = g.FOES.bubbledancer.dance;
  const z = g.spawnFoe("bubbledancer");
  assert.equal(z.row, d.row, "it did not take the middle lane");
  assert.ok(z.x > g.midX(g.COLS - 1), "it did not walk in from the edge like the others");
  let guard = 0;
  while (!z.dancing && guard++ < 900) g.step(100);
  assert.ok(z.dancing > 0, "it never stopped to dance");
  assert.ok(Math.abs(z.x - g.midX(g.COLS - 1)) < 12,
    "it did not dance on its first tile — the water's edge, where the designer put it");
  assert.equal(g.state().grid[0][d.bubbleCol].darkBubble || false, false, "bubbles came early");
  const xd = z.x;
  g.step(d.windup - 200);
  assert.equal(z.x, xd, "it walked mid-dance");
  g.step(400);
  let bubbles = 0;
  for (let r = 0; r < g.ROWS; r++) if (g.state().grid[r][d.bubbleCol].darkBubble) bubbles++;
  assert.equal(bubbles, g.ROWS, "the dance did not leave a bubble in every lane");
  g.step(600);
  assert.ok(z.x < xd, "it never walked on after the dance");
});

test("a Dancer killed on the walk or mid-dance leaves no bubbles", () => {
  const g = deepBoard();
  const d = g.FOES.bubbledancer.dance;
  const z = g.spawnFoe("bubbledancer");
  let guard = 0;
  while (!z.dancing && guard++ < 900) g.step(100);
  g.step(d.windup / 2);
  g.hurtFoe(z, 9999);
  g.step(d.windup);
  let bubbles = 0;
  for (let r = 0; r < g.ROWS; r++) if (g.state().grid[r][d.bubbleCol].darkBubble) bubbles++;
  assert.equal(bubbles, 0, "a dead Dancer still finished its dance");
});

test("the first enemy through a dark bubble takes the shield, and the bubble pops", () => {
  const g = deepBoard();
  const d = g.FOES.bubbledancer.dance;
  danceOver(g, d);
  const row = 0;
  const first = g.spawnFoe("drowned", row, g.midX(d.bubbleCol) + 40);
  let guard = 0;
  while (!first.shield && guard++ < 100) g.step(50);
  assert.equal(first.shield, d.shield, "the shield was not picked up");
  assert.equal(g.state().grid[row][d.bubbleCol].darkBubble, false, "the bubble did not pop");
  const second = g.spawnFoe("drowned", row, g.midX(d.bubbleCol) + 40);
  for (let i = 0; i < 80; i++) g.step(50);
  assert.ok(!second.shield, "a popped bubble shielded a second enemy");
});

test("the shield soaks damage before health, then breaks", () => {
  const g = deepBoard();
  const d = g.FOES.bubbledancer.dance;
  danceOver(g, d);
  const z = g.spawnFoe("drowned", 1, g.midX(d.bubbleCol) + 40);
  let guard = 0;
  while (!z.shield && guard++ < 100) g.step(50);
  const hp0 = z.hp;
  g.hurtFoe(z, 20);
  assert.equal(z.hp, hp0, "damage reached health through the shield");
  assert.equal(z.shield, d.shield - 20, "the shield did not soak the hit");
  g.hurtFoe(z, 20);
  assert.equal(z.shield, 0, "the shield did not break");
  assert.equal(z.hp, hp0 - 10, "the overflow did not carry into health");
});
