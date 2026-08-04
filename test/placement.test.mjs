/* Who can be put where, in each world. This is the area that was being checked by
 * clicking around a live board, which is how a dead level got mistaken for a bug. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

/* Each test gets its own board so nothing leaks between them. */
function level(world, lv = 1, sand = false) {
  const g = boot();
  g.meta.unlocked.bubbledial = 1;
  g.meta.unlocked.flatbird = 1;
  g.startLevel(world, lv, sand);
  g.setEnergy(9999);
  g.clearCooldowns();
  return g;
}

/* The Deep has no levels while its enemies are being designed, so its rules are
 * proved in the sandbox. canPlace draws no distinction between the two. */
const deepBox = () => level("deep", 1, true);

const cell = (g, r, c) => g.state().grid[r][c];
const unitAt = (g, r, c) => cell(g, r, c).unit;

/* find a square with no trench on it */
function openSquare(g, wanted = 0) {
  const grid = g.state().grid;
  let n = 0;
  for (let r = 0; r < g.ROWS; r++)
    for (let c = 1; c < g.COLS; c++)
      if (!grid[r][c].gap && !grid[r][c].unit && n++ === wanted) return [r, c];
  throw new Error("no open square");
}

function place(g, key, r, c) {
  g.clearCooldowns();
  g.select(key);
  g.click(r, c);
  return unitAt(g, r, c);
}

test("caves: a creature goes straight onto a bare square", () => {
  const g = level("caves");
  const [r, c] = openSquare(g);
  const u = place(g, "forge", r, c);
  assert.ok(u, "nothing was placed");
  assert.equal(u.key, "forge");
});

test("caves: a trench square holds nothing", () => {
  const g = level("sky", 1);          /* sky 1 lists its open-sky squares */
  const grid = g.state().grid;
  let gapAt = null;
  for (let r = 0; r < g.ROWS; r++)
    for (let c = 0; c < g.COLS; c++) if (grid[r][c].gap) gapAt = [r, c];
  assert.ok(gapAt, "this level was expected to have a trench");
  const u = place(g, "flatbird", gapAt[0], gapAt[1]);
  assert.equal(u, null, "a trench accepted a creature");
});

test("deep: open water refuses everything", () => {
  const g = deepBox();
  const [r, c] = openSquare(g);
  for (const k of ["forge", "cinderwisp", "drakeling", "phoenix", "tortoise"]) {
    assert.equal(place(g, k, r, c), null, `${k} was placed in open water`);
  }
});

test("deep: the crocodile goes on a bare square, blows a bubble, and leaves", () => {
  const g = deepBox();
  const [r, c] = openSquare(g);

  const croc = place(g, "bubbledial", r, c);
  assert.ok(croc, "the crocodile could not be placed");
  assert.equal(croc.key, "bubbledial");
  assert.equal(cell(g, r, c).bubble, false, "the bubble arrived too early");

  /* it blows after 700ms — step just short of that, then over it */
  g.step(600);
  assert.ok(unitAt(g, r, c), "the crocodile left before it had blown");
  assert.equal(cell(g, r, c).bubble, false);

  g.step(200);
  assert.equal(unitAt(g, r, c), null, "the crocodile stayed on the board");
  assert.equal(cell(g, r, c).bubble, true, "no bubble was left behind");
});

test("deep: a creature can be placed into the bubble", () => {
  const g = deepBox();
  const [r, c] = openSquare(g);
  place(g, "bubbledial", r, c);
  g.step(800);

  const u = place(g, "forge", r, c);
  assert.ok(u, "the bubble would not take a creature");
  assert.equal(u.key, "forge");
  assert.equal(u.carried, true, "a creature in a bubble should count as carried");
});

test("deep: the bubble outlives what sits in it", () => {
  const g = deepBox();
  const [r, c] = openSquare(g);
  place(g, "bubbledial", r, c);
  g.step(800);
  const u = place(g, "forge", r, c);

  /* kill the occupant outright */
  u.hp = 0;
  g.step(50);

  assert.equal(cell(g, r, c).bubble, true, "the bubble went with the creature");
  const again = place(g, "cinderwisp", r, c);
  assert.ok(again, "the bubble could not be refilled");
});

test("deep: a second crocodile will not stack on an existing bubble", () => {
  const g = deepBox();
  const [r, c] = openSquare(g);
  place(g, "bubbledial", r, c);
  g.step(800);
  assert.equal(place(g, "bubbledial", r, c), null, "two bubbles on one square");
});

test("deep: an empty bubble takes the boost the crocodile never waits for", () => {
  const g = deepBox();
  const [r, c] = openSquare(g);
  place(g, "bubbledial", r, c);
  g.step(800);                            /* crocodile gone, bubble standing */

  /* the sandbox bank refills itself, so the proof the boost landed is not a
     spent charge — it is the sea breathing */
  g.selectBoost(1);
  g.click(r, c);                          /* the boost lands on the bubble */

  /* the sea has breathed: bare water takes anything, and a keg can roll */
  const [r2, c2] = openSquare(g, 1);
  assert.equal(cell(g, r2, c2).bubble, false, "expected a square with no bubble");
  assert.equal(g.canPlace("forge", r2, c2).ok, true, "open water still refused a forge");
  assert.equal(g.canPlace("bombrider", r2, c2).ok, true, "a keg still had nothing to roll along");
});

test("deep: only the crocodile holds a square unaided", () => {
  const g = deepBox();
  assert.equal(g.holdsAlone("bubbledial"), true);
  for (const k of ["phoenix", "drakeling", "forge", "frostmoth", "flatbird"]) {
    assert.equal(g.holdsAlone(k), false, `${k} should need a bubble down here`);
  }
});

test("sky: anything winged holds its own square, the rest need the bird", () => {
  const g = level("sky");
  assert.equal(g.holdsAlone("phoenix"), true);
  assert.equal(g.holdsAlone("drakeling"), true);
  assert.equal(g.holdsAlone("forge"), false);
  assert.equal(g.holdsAlone("tortoise"), false);

  const [r, c] = openSquare(g);
  assert.equal(place(g, "forge", r, c), null, "a forge stood on open sky");
  const bird = place(g, "flatbird", r, c);
  assert.ok(bird, "the Flatbird could not be placed");
  const rider = place(g, "forge", r, c);
  assert.ok(rider, "the forge would not ride the bird");
  assert.equal(rider.onBird, true, "the bird should still be underneath");
});

test("a world only offers its own carrier", () => {
  const g = boot();
  g.setWorld("deep");
  assert.equal(g.CREATURES.flatbird.onlyIn, "sky");
  assert.equal(g.CREATURES.bubbledial.onlyIn, "deep");
});

test("deep: a dark bubble is not yours to fill", () => {
  const g = deepBox();
  const d = g.FOES.bubbledancer.dance;
  const z = g.spawnFoe("bubbledancer");
  let guard = 0;
  while (!z.danced && guard++ < 900) g.step(100);   /* walk it in, let it dance */
  const v = g.canPlace("bubbledial", d.row, d.bubbleCol);
  assert.equal(v.why, "enemyBubble", "the crocodile was allowed at a dark bubble");
  assert.ok(v.msg && v.msg.length > 10, "the refusal has no message for the player");
  assert.equal(g.canPlace("forge", 0, d.bubbleCol).why, "enemyBubble",
    "a creature was allowed into a dark bubble");
});
