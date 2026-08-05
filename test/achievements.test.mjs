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

test("other wins and sandbox wins earn nothing (yet)", () => {
  const g = boot();
  assert.deepEqual(g.earnFor("caves", 2, false), []);
  assert.deepEqual(g.earnFor("deep", 20, false), []);
  assert.deepEqual(g.earnFor("caves", 1, true), [], "the sandbox is practice — no medals");
  assert.equal("victory" in g.meta.achievements, false);
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
  }
});
