/* Levels as simulations — the tests that injectable time and an observable
 * outcome make possible.
 *
 * Note what is NOT here: "the reference line wins level N". Writing a bot good
 * enough to win is a project of its own (it has to wall before it shoots, and
 * cover five lanes from a cap of four), and a weak bot produces a suite that goes
 * red for reasons that have nothing to do with a regression. The balance net is
 * in curve.test.mjs instead, where it needs no bot at all.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

const STEP = 16;
const MAX_MS = 8 * 60_000;

function open(world, lv, seed = 7, sand = false) {
  const g = boot({ seed });
  for (const k of Object.keys(g.CREATURES)) g.meta.unlocked[k] = 1;
  g.startLevel(world, lv, sand);
  return g;
}

/* run to a conclusion with nobody defending */
function runUndefended(world, lv, seed = 7) {
  const g = open(world, lv, seed);
  let t = 0;
  while (g.state().running && t < MAX_MS) { g.step(STEP); t += STEP; }
  return { outcome: g.outcome(), ms: t };
}

test("every level reaches a conclusion rather than hanging", () => {
  const worlds = [["caves", g => g.LEVELS], ["sky", g => g.SKY_LEVELS], ["deep", g => g.DEEP_LEVELS]];
  const probe = boot();
  for (const [world, pick] of worlds) {
    for (const lv of Object.keys(pick(probe)).map(Number)) {
      const { outcome, ms } = runUndefended(world, lv);
      assert.ok(outcome, `${world} ${lv} never resolved (ran ${ms}ms of game time)`);
    }
  }
});

test("an undefended wellspring always falls", () => {
  /* the sanity check under every balance question: if a level can be won by
     doing nothing, its wave is empty or its enemies cannot reach you */
  const probe = boot();
  const worlds = [["caves", probe.LEVELS], ["sky", probe.SKY_LEVELS], ["deep", probe.DEEP_LEVELS]];
  for (const [world, table] of worlds) {
    for (const lv of Object.keys(table).map(Number)) {
      const { outcome } = runUndefended(world, lv);
      assert.equal(outcome.result, "lose",
        `${world} ${lv} was won without placing anything`);
      assert.equal(outcome.level, lv);
      assert.equal(outcome.world, world);
    }
  }
});

test("the same seed plays out identically", () => {
  const a = runUndefended("caves", 3, 42);
  const b = runUndefended("caves", 3, 42);
  assert.equal(a.ms, b.ms, "the same seed produced a different length of level");
  assert.deepEqual(a.outcome, b.outcome);
});

test("a different seed is actually a different game", () => {
  /* if this ever passes trivially, the rng seam has come unhooked and every
     "deterministic" test above is testing nothing */
  const lengths = new Set([1, 2, 3, 4, 5, 6].map(s => runUndefended("caves", 6, s).ms));
  assert.ok(lengths.size > 1, "six different seeds produced identical games");
});

test("nothing can be placed in the Deep without the crocodile", () => {
  /* the Deep has no levels while its enemies are being designed — the rule
     is proved in the sandbox, where placement answers the same */
  const g = open("deep", 1, 7, true);
  for (let r = 0; r < g.ROWS; r++)
    for (let c = 0; c < g.COLS; c++)
      for (const k of ["forge", "cinderwisp", "tortoise", "phoenix", "drakeling"])
        assert.equal(g.canPlace(k, r, c).ok, false,
          `${k} could stand in open water at ${r},${c}`);
});

test("a placed line does measurably hold the wave back", () => {
  /* not "it wins" — only that defending is better than not, which is the weakest
     claim that would still catch damage or targeting breaking outright */
  const bare = runUndefended("caves", 1);

  const g = open("caves", 1);
  let t = 0;
  while (g.state().running && t < MAX_MS) {
    for (let r = 0; r < g.ROWS; r++) {
      for (const k of ["cinderwisp", "tinyember", "drakeling"]) {
        if (g.canPlace(k, r, 2).ok) { g.select(k); g.click(r, 2); break; }
      }
      if (g.canPlace("forge", r, 0).ok) { g.select("forge"); g.click(r, 0); }
    }
    g.step(STEP); t += STEP;
  }
  assert.ok(t > bare.ms,
    `defending held out ${t}ms, no better than the ${bare.ms}ms of an empty board`);
});
