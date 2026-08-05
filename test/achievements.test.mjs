/* Medals of the run.
 *
 * An achievement is a table row — a name and the win that earns it. earnFor
 * decides what a win just earned, once a session and never in the sandbox;
 * the toast in the corner is only the messenger, so it is not tested here.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

test("clearing Caves 1 earns Victory at last, exactly once", () => {
  const g = boot();
  assert.deepEqual(g.earnFor("caves", 1, false), ["victory"]);
  assert.equal(g.meta.achievements.victory, 1);
  assert.deepEqual(g.earnFor("caves", 1, false), [], "a medal is not earned twice");
});

test("other wins and sandbox wins earn nothing", () => {
  const g = boot();
  assert.deepEqual(g.earnFor("caves", 2, false), []);
  assert.deepEqual(g.earnFor("deep", 19, false), []);
  assert.deepEqual(g.earnFor("caves", 1, true), [], "the sandbox is practice — no medals");
  assert.equal("victory" in g.meta.achievements, false);
});

test("each crown has its medal — one per boss, once each", () => {
  const g = boot();
  assert.deepEqual(g.earnFor("caves", 15, false), ["king"],    "the Bone King");
  assert.deepEqual(g.earnFor("sky", 17, false),   ["storm"],   "the Thunderhead");
  assert.deepEqual(g.earnFor("deep", 20, false),  ["majesty"], "the Drowned Ruler");
  assert.deepEqual(g.earnFor("caves", 15, false), [], "a king only dies once");
});

test("the toast card carries the medal's name into the corner stack", () => {
  /* no browser playtest — toastAch hands its card back so the suite can read
     it: right words, right class, parented in the fixed top-right stack */
  const g = boot();
  const card = g.toastAch("victory");
  assert.ok(card, "no card came back");
  assert.equal(card.className, "ach");
  assert.match(card.innerHTML, /Victory at last/);
  assert.equal(card.parentNode && card.parentNode.id, "achToasts");
});

test("every achievement row is whole — a name, a how, and a when", () => {
  const g = boot();
  for (const k in g.ACHIEVEMENTS) {
    const a = g.ACHIEVEMENTS[k];
    assert.ok(a.name, k + " has no name");
    assert.ok(a.how, k + " does not say how it is earned");
    assert.ok(a.when && a.when.world && a.when.level, k + " has no earning win");
    const table = { caves: g.LEVELS, sky: g.SKY_LEVELS, deep: g.DEEP_LEVELS }[a.when.world];
    assert.ok(table && table[a.when.level],
      k + " points at " + a.when.world + " " + a.when.level + ", which does not exist");
  }
});
