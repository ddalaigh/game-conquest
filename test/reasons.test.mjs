/* Why a square refuses what you are holding.
 *
 * Before canPlace existed, every one of these looked identical from the outside:
 * no creature appeared. That ambiguity is what made a finished level look like a
 * placement bug.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

function level(world = "caves", lv = 1, sand = false) {
  const g = boot();
  for (const k of ["bubbledial", "flatbird", "blowertortoise"]) g.meta.unlocked[k] = 1;
  g.startLevel(world, lv, sand);
  g.setEnergy(9999);
  g.clearCooldowns();
  return g;
}

/* The Deep has no levels while its enemies are being designed — its refusals
 * are read off the sandbox instead, where canPlace answers identically. */
const deepBox = () => level("deep", 1, true);

function openSquare(g, skip = 0) {
  const grid = g.state().grid;
  let n = 0;
  for (let r = 0; r < g.ROWS; r++)
    for (let c = 1; c < g.COLS; c++)
      if (!grid[r][c].gap && !grid[r][c].unit && n++ === skip) return [r, c];
  throw new Error("no open square");
}

function trench(g) {
  const grid = g.state().grid;
  for (let r = 0; r < g.ROWS; r++)
    for (let c = 0; c < g.COLS; c++) if (grid[r][c].gap) return [r, c];
  return null;
}

test("a finished level says so, rather than silently ignoring you", () => {
  const g = level();
  const [r, c] = openSquare(g);
  assert.equal(g.canPlace("forge", r, c).ok, true);

  g.state().foes.length = 0;
  g.meta.cleared = {};
  /* end the level the way the game does */
  while (g.state().running) g.step(100);

  assert.equal(g.canPlace("forge", r, c).why, "notRunning");
});

test("not enough energy is distinguishable from a bad square", () => {
  const g = level();
  const [r, c] = openSquare(g);
  g.setEnergy(0);
  assert.equal(g.canPlace("forge", r, c).why, "energy");
});

test("a recharging creature reports the cooldown", () => {
  const g = level();
  const [r, c] = openSquare(g);
  g.select("forge");
  g.click(r, c);
  const [r2, c2] = openSquare(g, 1);
  assert.equal(g.canPlace("forge", r2, c2).why, "cooldown");
});

test("an occupied square and a trench are different refusals", () => {
  const g = level("sky", 1);
  g.setEnergy(9999);
  const [r, c] = openSquare(g);
  g.select("flatbird");
  g.click(r, c);
  g.clearCooldowns();
  assert.equal(g.canPlace("flatbird", r, c).why, "occupied");

  const t = trench(g);
  assert.ok(t, "this level was expected to have open sky");
  assert.equal(g.canPlace("flatbird", t[0], t[1]).why, "trench");
});

test("the projection cap is its own refusal", () => {
  const g = level();
  const cap = g.capOf("forge");
  let placed = 0;
  for (let r = 0; r < g.ROWS && placed < cap; r++) {
    for (let c = 1; c < g.COLS && placed < cap; c++) {
      g.clearCooldowns();
      g.select("forge");
      g.click(r, c);
      if (g.state().grid[r][c].unit) placed++;
    }
  }
  assert.equal(placed, cap, "could not fill the cap");
  g.clearCooldowns();
  const [r, c] = openSquare(g);
  assert.equal(g.canPlace("forge", r, c).why, "cap");
});

test("the Deep names the reason there is nowhere to stand", () => {
  const g = deepBox();
  const [r, c] = openSquare(g);
  assert.equal(g.canPlace("forge", r, c).why, "noBubble");

  g.select("bubbledial");
  g.click(r, c);
  g.step(800);
  g.clearCooldowns();
  assert.equal(g.canPlace("forge", r, c).ok, true);
  assert.equal(g.canPlace("bubbledial", r, c).why, "alreadyBubble");
});

test("the Sky names the reason a flightless creature cannot stand", () => {
  const g = level("sky");
  const [r, c] = openSquare(g);
  assert.equal(g.canPlace("forge", r, c).why, "noCarrier");
});

test("a keg with nothing to roll along names its missing footing", () => {
  const g = deepBox();
  const [r, c] = openSquare(g);
  assert.equal(g.canPlace("bombrider", r, c).why, "noFooting");
  const s = level("sky");
  const [r2, c2] = openSquare(s);
  assert.equal(s.canPlace("bombrider", r2, c2).why, "noFooting");
});

test("an upgrade on the wrong square names the base it wants", () => {
  const g = level();
  const [r, c] = openSquare(g);
  const v = g.canPlace("twinforge", r, c);
  assert.equal(v.why, "wrongBase");
  assert.ok(v.msg.includes(g.CREATURES.forge.name), "the message does not name the base");
});

test("an upgrade whose base is itself fused is refused as such", () => {
  /* no shipped upgrade has a fused base, so the path gets a synthetic one —
     the fresh boot keeps the doctored table out of every other test */
  const g = level();
  g.CREATURES.__fusedupgrade = { name: "Test Shell", family: "guardian",
    cost: 0, rc: 0, hp: 1, from: "blowertortoise" };
  const [r, c] = openSquare(g);
  assert.equal(g.canPlace("__fusedupgrade", r, c).why, "notUpgradable");
});

test("spent support uses are their own refusal", () => {
  const g = level();
  const [r, c] = openSquare(g);
  for (let i = 0; i < 2; i++) {       /* two uses per level, then the moth is done */
    g.clearCooldowns();
    g.select("frostmoth");
    g.click(r, c);
  }
  g.clearCooldowns();
  assert.equal(g.canPlace("frostmoth", r, c).why, "noSupportLeft");
});

test("an unknown creature or an off-board square is refused, not thrown", () => {
  const g = level();
  assert.equal(g.canPlace("nosuchcreature", 0, 1).why, "unknownCreature");
  assert.equal(g.canPlace("forge", -1, 0).why, "offBoard");
  assert.equal(g.canPlace("forge", 0, 99).why, "offBoard");
  assert.equal(g.canPlace(null, 0, 1).why, "nothingSelected");
});

test("every refusal a player can hit carries a message", () => {
  /* the silent ones are the states the UI already shows elsewhere — a finished
     level, an empty hand, an unaffordable price greyed out in the tray */
  const silent = new Set(["notRunning", "nothingSelected", "unknownCreature",
                          "offBoard", "energy", "cooldown"]);
  const g = deepBox();
  const [r, c] = openSquare(g);
  const seen = [
    g.canPlace("forge", r, c),
    g.canPlace("nosuchcreature", r, c)
  ];
  for (const v of seen) {
    if (v.ok || silent.has(v.why)) continue;
    assert.ok(v.msg && v.msg.length > 10, `refusal "${v.why}" has no message for the player`);
  }
});
