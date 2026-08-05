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

test("finishing a family earns its medal — all six, one each", () => {
  const probe = boot();
  const families = [...new Set(Object.values(probe.CREATURES).map(c => c.family))];
  for (const fam of families) {
    const g = boot();
    const medal = Object.keys(g.ACHIEVEMENTS)
      .find(k => g.ACHIEVEMENTS[k].when.family === fam);
    assert.ok(medal, "the " + fam + " family has no medal");
    for (const k in g.CREATURES) if (g.CREATURES[k].family === fam) g.meta.unlocked[k] = 1;
    assert.deepEqual(g.earnOn({ unlocked: true }), [medal], fam);
    assert.deepEqual(g.earnOn({ unlocked: true }), [], fam + " is earned once");
  }
});

test("a family one creature short earns nothing", () => {
  const g = boot();
  const dragons = Object.keys(g.CREATURES).filter(k => g.CREATURES[k].family === "dragon");
  /* withhold one the starting six does not already own */
  const withheld = dragons.find(k => !g.meta.unlocked[k]);
  for (const k of dragons) if (k !== withheld) g.meta.unlocked[k] = 1;
  assert.deepEqual(g.earnOn({ unlocked: true }), []);
});

test("the starting six finish no family", () => {
  const g = boot();
  assert.deepEqual(g.earnOn({ unlocked: true }), []);
});

test("Well, that's something new — met at the spawn, once, tricks only", () => {
  const g = boot();
  g.startLevel("caves", 3, false);
  g.spawnFoe("skeleton", 1, 400);
  assert.equal("something" in g.meta.achievements, false, "a plain walker is nothing new");
  g.spawnFoe("archer", 2, 400);
  assert.equal(g.meta.achievements.something, 1, "the first archer is the moment");
  assert.deepEqual(g.earnOn({ met: { kind: "goblin" } }), [], "the surprise only happens once");
  const g2 = boot();
  g2.startLevel("caves", 3, true);
  g2.spawnFoe("archer", 2, 400);
  assert.equal("something" in g2.meta.achievements, false, "the sandbox surprises nobody");
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

test("Blowing up — only a blast kill earns it, and not in the sandbox", () => {
  const g = boot();
  assert.deepEqual(g.earnOn({ kill: { by: "blast" } }), ["blow"]);
  assert.deepEqual(g.earnOn({ kill: { by: "blast" } }), [], "one boom is enough");
  const g2 = boot();
  assert.deepEqual(g2.earnOn({ kill: { kind: "skeleton", undanced: true } }), [],
    "an ordinary kill is not a blast");
  assert.deepEqual(g2.earnOn({ kill: { by: "blast" }, sand: true }), []);
});

test("a real Bomb Rider blast on a real skeleton earns Blowing up", () => {
  const g = boot();
  g.meta.unlocked.bombrider = 1;
  g.startLevel("caves", 1, false);
  g.setEnergy(9999);
  g.clearCooldowns();
  g.select("bombrider");
  g.click(2, 1);                       /* the rider launches from the square */
  g.spawnFoe("skeleton", 2, g.midX(5));
  for (let i = 0; i < 600 && !g.meta.achievements.blow; i++) g.step(16);
  assert.equal(g.meta.achievements.blow, 1, "the rider rolled and nothing boomed");
});

test("Burning — the fire-only promise is tracked through real placements", () => {
  const g = boot();
  for (const k of ["bonfire", "slingroc", "bombrider"]) g.meta.unlocked[k] = 1;
  g.startLevel("caves", 1, false);
  g.setEnergy(99999);

  g.clearCooldowns(); g.select("bonfire");  g.click(0, 3);
  assert.equal(g.pureFireNow(), true, "a fire damager keeps the promise");
  g.clearCooldowns(); g.select("tortoise"); g.click(1, 3);
  assert.equal(g.pureFireNow(), true, "a harmless wall spoils nothing");
  g.clearCooldowns(); g.select("slingroc"); g.click(2, 3);
  assert.equal(g.pureFireNow(), false, "a non-fire damager breaks it");

  g.startLevel("caves", 1, false);
  assert.equal(g.pureFireNow(), true, "a new level renews the promise");
  g.setEnergy(99999); g.clearCooldowns();
  g.select("bombrider"); g.click(2, 1);
  assert.equal(g.pureFireNow(), false, "the rider counts even though it never holds a square");

  assert.deepEqual(g.earnOn({ pureFire: true }), ["burning"]);
  assert.deepEqual(g.earnOn({ pureFire: true }), [], "worn once");
});

test("Unproductive — even a harmless Ember Forge spoils the forge-free promise", () => {
  const g = boot();
  g.meta.unlocked.bombrider = 1;
  g.startLevel("caves", 1, false);
  g.setEnergy(99999);

  g.clearCooldowns(); g.select("bonfire");  g.click(0, 3);
  g.clearCooldowns(); g.select("tortoise"); g.click(1, 3);
  assert.equal(g.noForgeNow(), true, "dragons and walls are not forges");
  g.clearCooldowns(); g.select("forge");    g.click(2, 3);
  assert.equal(g.noForgeNow(), false, "the Ember Forge deals no damage, and spoils it anyway");

  g.startLevel("caves", 1, false);
  assert.equal(g.noForgeNow(), true, "a new level renews the promise");
  g.setEnergy(99999); g.clearCooldowns();
  g.select("bombrider"); g.click(2, 1);
  assert.equal(g.noForgeNow(), false, "the Bomb Rider was born a forge");
  assert.equal(g.pureFireNow(), false, "and it breaks the fire promise too");

  assert.deepEqual(g.earnOn({ noForge: true }), ["unproductive"]);
  assert.deepEqual(g.earnOn({ noForge: true }), [], "earned once");
});

test("the sandbox neither spoils nor earns the fire promise", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.setEnergy(99999); g.clearCooldowns();
  g.select("slingroc"); g.click(2, 3);
  assert.equal(g.pureFireNow(), true, "sandbox placements are practice");
});

test("the fire list and the damage test both read straight off the tables", () => {
  const g = boot();
  for (const k in g.FIRE_CREATURES)
    assert.ok(g.CREATURES[k], "fire list names \"" + k + "\", which does not exist");
  assert.equal(g.dealsDamage("bonfire"), true);
  assert.equal(g.dealsDamage("bombrider"), true);
  assert.equal(g.dealsDamage("tortoise"), false, "the Bulwark hurts nobody");
  assert.equal(g.dealsDamage("frostmoth"), false, "frost stings nothing");
});

test("the achievements screen lists every medal, veiled until earned", () => {
  const g = boot();
  const rows = g.achRows();
  assert.equal(rows.length, Object.keys(g.ACHIEVEMENTS).length, "a medal is missing from the shelf");
  for (const r of rows) {
    assert.equal(r.earned, false);
    assert.equal(r.how, "Still to be earned.", r.key + " gives away its how too early");
  }
  g.earnOn({ win: { world: "caves", level: 1 } });
  const after = g.achRows();
  const v = after.find(r => r.key === "victory");
  assert.equal(v.earned, true);
  assert.equal(v.how, "Clear the first level of the Caves", "an earned medal tells its story");
  assert.equal(after.filter(r => r.earned).length, 1, "only the earned medal unveils");
  g.buildAchScreen();   /* and the painter runs on the fake DOM without complaint */
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
      assert.ok((Array.isArray(a.when.kill.of) && a.when.kill.of.length) || a.when.kill.by,
        k + " kills nothing in particular");
      if (a.when.kill.of) for (const f of a.when.kill.of)
        assert.ok(g.FOES[f], k + " points at foe \"" + f + "\", which does not exist");
    } else if (a.when.family) {
      assert.ok(Object.values(g.CREATURES).some(c => c.family === a.when.family),
        k + " points at family \"" + a.when.family + "\", which no creature has");
    } else if (a.when.met) {
      assert.ok(Array.isArray(a.when.met.of) && a.when.met.of.length, k + " meets nobody");
      for (const f of a.when.met.of)
        assert.ok(g.FOES[f], k + " points at foe \"" + f + "\", which does not exist");
    } else if (a.when.pureFire || a.when.noForge) {
      assert.equal(a.when.pureFire || a.when.noForge, true,
        k + " has a challenge flag that is not simply true");
    } else {
      assert.fail(k + " has a when shape earnOn does not understand");
    }
  }
});
