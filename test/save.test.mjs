/* A save is a promise to your future self.
 *
 * The whole game's memory lives in one object, meta, so the save format is
 * that object written down with a version and a checksum. These tests pin the
 * promises: a round trip loses nothing, a bad file is refused with a reason,
 * and a save carries earned progress only — no furniture, no dev shortcuts.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

/* The format is written down here on purpose, independent of the game's own
 * helper — if either side drifts, this suite is where it shows. */
const TAG = "CONQSAVE";
function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function craft(data) {
  const body = JSON.stringify(data);
  return TAG + "." + btoa(body) + "." + djb2(body);
}

function richMeta(g) {
  g.meta.cleared[1] = true;
  g.meta.cleared["s1"] = true;
  g.meta.cleared["d1"] = true;
  g.meta.unlocked.stonedragon = 1;
  g.meta.foesBeaten.bossking = 1;
  g.meta.bank[2] = 3;
  g.meta.capUp.forge = 1;
  g.meta.pairTable = true;
}

test("a round trip loses nothing", () => {
  const g = boot();
  richMeta(g);
  const file = g.encodeSave();
  const g2 = boot();
  const r = g2.applySave(file);
  assert.equal(r.ok, true);
  assert.deepEqual(g2.meta, g.meta);
});

test("a save is one line of plain text", () => {
  const g = boot();
  richMeta(g);
  assert.match(g.encodeSave(), /^\S+$/);
});

test("wrong files are refused with a reason, not silence", () => {
  const g = boot();
  assert.equal(g.applySave("dear diary, today I beat the Bone King").why, "not_a_save");
  assert.equal(g.applySave(TAG + ".!!!not-base64!!!.x").why, "garbled");
  assert.equal(g.applySave(craft({ v: 99, meta: {} })).why, "too_new");
});

test("a hand-edited save is called damaged", () => {
  const g = boot();
  const parts = g.encodeSave().split(".");
  const edited = atob(parts[1]).replace('"pairTable":false', '"pairTable":true');
  const r = boot().applySave(TAG + "." + btoa(edited) + "." + parts[2]);
  assert.equal(r.ok, false);
  assert.equal(r.why, "damaged");
});

test("a save brings back progress, not new furniture", () => {
  const g = boot();
  richMeta(g);
  g.meta.hacks = { gold: 9999 };
  const file = g.encodeSave();
  const g2 = boot();
  assert.equal(g2.applySave(file).ok, true);
  assert.equal("hacks" in g2.meta, false);
  assert.equal(g2.meta.cleared["s1"], true);
});

test("a save missing a piece loads that piece as a new game's", () => {
  const g = boot();
  const r = g.applySave(craft({ v: 1, meta: { cleared: { 3: true } } }));
  assert.equal(r.ok, true);
  assert.equal(g.meta.cleared[3], true);
  assert.deepEqual(g.meta.bank, { 1: 0, 2: 0, 3: 0 });
  assert.equal(g.meta.unlocked.forge, 1, "the starting six survive");
});

test("a fresh save carries no unearned clears, whatever DEV flags pretend", () => {
  const file = boot().encodeSave();
  const g2 = boot();
  assert.equal(g2.applySave(file).ok, true);
  assert.equal(Object.keys(g2.meta.cleared).length, 0);
});
