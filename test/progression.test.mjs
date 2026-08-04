/* The doors of Conquest, and when they open.
 *
 * A fresh game opens exactly one: Caves level 1. Every other door is earned —
 * each level off the one before it, the Sky off the Caves' last level, the
 * Deep off the Sky's. DEV_ALL_OPEN is a designer's key, not a promise, so
 * both of its positions are checked here and neither is assumed.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

function earned() {
  const g = boot();
  g.devAllOpen(false);
  return g;
}

const last = (levels) => Math.max(...Object.keys(levels).map(Number));

test("a fresh game opens exactly one door — Caves level 1", () => {
  const g = earned();
  assert.equal(g.caveOpen(1), true);
  assert.equal(g.caveOpen(2), false);
  assert.equal(g.skyWorldOpen(), false);
  assert.equal(g.skyOpen(1), false);
  assert.equal(g.deepWorldOpen(), false);
  assert.equal(g.deepOpen(1), false);
});

test("beating a level opens the next, and only the next", () => {
  const g = earned();
  g.meta.cleared[1] = true;
  assert.equal(g.caveOpen(2), true);
  assert.equal(g.caveOpen(3), false);
});

test("worlds are earned off their bosses", () => {
  const g = earned();
  g.meta.cleared[last(g.LEVELS)] = true;      /* the Bone King falls */
  assert.equal(g.skyWorldOpen(), true);
  assert.equal(g.skyOpen(1), true);
  assert.equal(g.deepWorldOpen(), false, "the Deep waits for the Sky");
  g.meta.cleared["s" + last(g.SKY_LEVELS)] = true;  /* the Thunderhead falls */
  assert.equal(g.deepWorldOpen(), true);
  assert.equal(g.deepOpen(1), true);
  assert.equal(g.deepOpen(2), false);
});

test("the designer's key opens everything, and turns back", () => {
  const g = boot();
  g.devAllOpen(true);
  assert.equal(g.caveOpen(last(g.LEVELS)), true);
  assert.equal(g.deepOpen(last(g.DEEP_LEVELS)), true);
  g.devAllOpen(false);
  assert.equal(g.deepOpen(last(g.DEEP_LEVELS)), false);
});
