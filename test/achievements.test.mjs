/* Medals of the run.
 *
 * An achievement is a table row — a name and the triumph that earns it. earnOn
 * is the one dispatcher: hand it what just happened ({win:{world,level}} or
 * {fused:count}, plus sand) and it says which medals that earned, once a
 * session and never in the sandbox. The toast in the corner is only the
 * messenger, and it hands its card back so the suite can read it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

const win = (world, level, sand = false) => ({ win: { world, level }, sand });

test("clearing Caves 1 earns Victory at last, exactly once", () => {
  const g = boot();
  assert.deepEqual(g.earnOn(win("caves", 1)), ["victory"]);
  assert.equal(g.meta.achievements.victory, 1);
  assert.deepEqual(g.earnOn(win("caves", 1)), [], "a medal is not earned twice");
});

test("other wins and sandbox wins earn nothing", () => {
  const g = boot();
  assert.deepEqual(g.earnOn(win("caves", 2)), []);
  assert.deepEqual(g.earnOn(win("deep", 19)), []);
  assert.deepEqual(g.earnOn(win("caves", 1, true)), [], "the sandbox is practice — no medals");
  assert.equal("victory" in g.meta.achievements, false);
});

test("each crown has its medal — one per boss, once each", () => {
  const g = boot();
  assert.deepEqual(g.earnOn(win("caves", 15)), ["king"],    "the Bone King");
  assert.deepEqual(g.earnOn(win("sky", 17)),   ["storm"],   "the Thunderhead");
  assert.deepEqual(g.earnOn(win("deep", 20)),  ["majesty"], "the Drowned Ruler");
  assert.deepEqual(g.earnOn(win("caves", 15)), [], "a king only dies once");
});

test("the first fusion earns Binding; the last earns the Federal of Fusion Award", () => {
  const g = boot();
  const total = g.fusibleTotal();
  assert.ok(total > 2, "the game should have more than two fusions");
  assert.deepEqual(g.earnOn({ fused: 1 }), ["binding"]);
  assert.deepEqual(g.earnOn({ fused: total - 1 }), [], "not the award before the last one");
  assert.deepEqual(g.earnOn({ fused: total }), ["federal"]);
  assert.deepEqual(g.earnOn({ fused: total }), [], "the award is given once");
});

test("sandbox fusions earn nothing", () => {
  const g = boot();
  assert.deepEqual(g.earnOn({ fused: 1, sand: true }), []);
  assert.equal("binding" in g.meta.achievements, false);
});

test("Party pooper — either dancer, only before the bubbles", () => {
  const g = boot();
  assert.deepEqual(g.earnOn({ kill: { kind: "bubbledancer", undanced: true } }), ["pooper"]);
  const g2 = boot();
  assert.deepEqual(g2.earnOn({ kill: { kind: "discodancer", undanced: true } }), ["pooper"],
    "the disco dancer counts too");
  const g3 = boot();
  assert.deepEqual(g3.earnOn({ kill: { kind: "bubbledancer", undanced: false } }), [],
    "after the bubbles it is just a kill");
  assert.deepEqual(g3.earnOn({ kill: { kind: "skeleton", undanced: true } }), [],
    "no other foe pops this party");
  assert.deepEqual(g3.earnOn({ kill: { kind: "bubbledancer", undanced: true }, sand: true }), []);
});

test("a dancer killed mid-dance through the real death path earns it", () => {
  const g = boot();
  g.startLevel("deep", 1, false);
  const z = g.spawnFoe("bubbledancer", 1, 300);
  assert.equal(z.danced, false, "fresh on the board, it has not danced yet");
  g.hurtFoe(z, 99999);
  assert.equal(g.meta.achievements.pooper, 1, "the kill did not earn the medal");
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

test("every achievement row is whole, and points at something real", () => {
  const g = boot();
  for (const k in g.ACHIEVEMENTS) {
    const a = g.ACHIEVEMENTS[k];
    assert.ok(a.name, k + " has no name");
    assert.ok(a.how, k + " does not say how it is earned");
    assert.ok(a.when, k + " has no earning triumph");
    if (a.when.win) {
      const table = { caves: g.LEVELS, sky: g.SKY_LEVELS, deep: g.DEEP_LEVELS }[a.when.win.world];
      assert.ok(table && table[a.when.win.level],
        k + " points at " + a.when.win.world + " " + a.when.win.level + ", which does not exist");
    } else if (a.when.fused) {
      assert.ok(a.when.fused === "all" || Number.isInteger(a.when.fused),
        k + " has a fused threshold that is neither a count nor \"all\"");
    } else if (a.when.kill) {
      assert.ok(Array.isArray(a.when.kill.of) && a.when.kill.of.length,
        k + " kills nothing in particular");
      for (const f of a.when.kill.of)
        assert.ok(g.FOES[f], k + " points at foe \"" + f + "\", which does not exist");
    } else {
      assert.fail(k + " has a when shape earnOn does not understand");
    }
  }
});
