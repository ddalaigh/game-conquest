/* Data invariants. Cheap, and they catch the whole class of mistake where a new
 * creature or enemy is added in one table and forgotten in four others. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { game } from "./harness.mjs";

const g = game();
const WORLD_LEVELS = [
  ["caves", g.LEVELS],
  ["sky", g.SKY_LEVELS],
  ["deep", g.DEEP_LEVELS]
];

test("every level's wave names a real enemy", () => {
  for (const [world, table] of WORLD_LEVELS) {
    for (const [n, L] of Object.entries(table)) {
      for (const kind of L.mix || []) {
        assert.ok(g.FOES[kind], `${world} ${n}: mix names unknown foe "${kind}"`);
      }
      if (L.rare) assert.ok(g.FOES[L.rare.kind], `${world} ${n}: unknown rare "${L.rare.kind}"`);
      if (L.boss) {
        const bk = L.bossKind || "bossking";
        assert.ok(g.FOES[bk], `${world} ${n}: unknown boss "${bk}"`);
        assert.ok(g.FOES[bk].boss, `${world} ${n}: "${bk}" is not flagged as a boss`);
      }
    }
  }
});

test("a level only ever fields enemies from its own world", () => {
  for (const [world, table] of WORLD_LEVELS) {
    for (const [n, L] of Object.entries(table)) {
      for (const kind of L.mix || []) {
        const fw = g.FOES[kind].world || "caves";
        assert.equal(fw, world, `${world} ${n}: "${kind}" belongs to ${fw}`);
      }
    }
  }
});

test("every trench sits on the board", () => {
  for (const [world, table] of WORLD_LEVELS) {
    for (const [n, L] of Object.entries(table)) {
      for (const [r, c] of L.gaps || []) {
        assert.ok(r >= 0 && r < g.ROWS, `${world} ${n}: gap row ${r} off the board`);
        assert.ok(c >= 0 && c < g.COLS, `${world} ${n}: gap col ${c} off the board`);
      }
    }
  }
});

test("no level is entirely trenches in one lane", () => {
  for (const [world, table] of WORLD_LEVELS) {
    for (const [n, L] of Object.entries(table)) {
      const perRow = {};
      for (const [r] of L.gaps || []) perRow[r] = (perRow[r] || 0) + 1;
      for (const [r, count] of Object.entries(perRow)) {
        assert.ok(count < g.COLS, `${world} ${n}: lane ${r} is nothing but trench`);
      }
    }
  }
});

test("every enemy has art and a name", () => {
  for (const [k, d] of Object.entries(g.FOES)) {
    assert.ok(d.name, `${k}: no name`);
    assert.ok(typeof d.art === "string" && d.art.length > 20, `${k}: no art`);
    assert.ok(d.hp > 0, `${k}: no health`);
    assert.ok(d.speed > 0, `${k}: no speed`);
  }
});

test("every enemy is listed in exactly one almanac roster", () => {
  const rosters = {
    caves: g.CAVE_FOE_ORDER,
    sky: g.SKY_FOE_ORDER,
    deep: g.DEEP_FOE_ORDER
  };
  const seen = new Map();
  for (const [world, list] of Object.entries(rosters)) {
    for (const k of list) {
      assert.ok(g.FOES[k], `${world} roster names unknown foe "${k}"`);
      assert.ok(!seen.has(k), `"${k}" is in both the ${seen.get(k)} and ${world} rosters`);
      seen.set(k, world);
    }
  }
  for (const k of Object.keys(g.FOES)) {
    assert.ok(seen.has(k), `"${k}" is in no almanac roster — it would never be listed`);
    assert.equal(seen.get(k), g.FOES[k].world || "caves",
      `"${k}" is rostered under ${seen.get(k)} but belongs to ${g.FOES[k].world || "caves"}`);
  }
});

test("every creature has art and appears in a tray order", () => {
  const ordered = new Set([...g.ORDER, ...g.UPGRADE_ORDER]);
  for (const [k, d] of Object.entries(g.CREATURES)) {
    assert.ok(d.name, `${k}: no name`);
    assert.ok(typeof g.ART[k] === "string" && g.ART[k].length > 20, `${k}: no art`);
    assert.ok(ordered.has(k), `${k}: in no tray order, so it can never be shown`);
  }
  for (const k of ordered) {
    assert.ok(g.CREATURES[k], `tray order names unknown creature "${k}"`);
  }
});

test("every fusion recipe names things that exist", () => {
  for (const r of g.RECIPES) {
    assert.ok(g.CREATURES[r.creature], `recipe: unknown creature "${r.creature}"`);
    assert.ok(g.ITEMS[r.item], `recipe: unknown item "${r.item}"`);
    assert.ok(g.CREATURES[r.result], `recipe: unknown result "${r.result}"`);
  }
  for (const r of g.PAIR_RECIPES) {
    assert.ok(g.CREATURES[r.a], `pair recipe: unknown creature "${r.a}"`);
    assert.ok(g.CREATURES[r.b], `pair recipe: unknown creature "${r.b}"`);
    assert.ok(g.CREATURES[r.result], `pair recipe: unknown result "${r.result}"`);
  }
});

test("every level reward names something real", () => {
  const check = (table, label, lookup) => {
    for (const [lv, key] of Object.entries(table)) {
      assert.ok(lookup[key], `${label} ${lv}: unknown reward "${key}"`);
    }
  };
  check(g.LEVEL_ITEM, "cave item", g.ITEMS);
  check(g.SKY_ITEM, "sky item", g.ITEMS);
  check(g.LEVEL_CREATURE, "cave creature", g.CREATURES);
  check(g.LEVEL_MYTHIC, "cave mythic", g.MYTHICS);
  check(g.SKY_MYTHIC, "sky mythic", g.MYTHICS);
  /* a mythic has to be a real creature too, or it cannot be fielded */
  for (const key of [...Object.values(g.LEVEL_MYTHIC), ...Object.values(g.SKY_MYTHIC)]) {
    assert.ok(g.CREATURES[key], `mythic "${key}" is not a placeable creature`);
  }
});

test("each no-ground world has a free carrier you can always fall back on", () => {
  const carriers = Object.entries(g.CREATURES).filter(([, d]) => d.carrier || d.blows);
  for (const world of ["sky", "deep"]) {
    const mine = carriers.filter(([, d]) => d.onlyIn === world);
    assert.ok(mine.length > 0, `${world}: no carrier at all — nothing could be placed`);
    /* fused carriers may cost (the Long Bird does); at least one must be free, or a
       player with no energy in hand could be locked out of the board entirely */
    assert.ok(mine.some(([, d]) => d.cost === 0),
      `${world}: every carrier costs energy — the board could become unplayable`);
    for (const [k, d] of mine) assert.ok(d.cap > 0, `${k}: no cap`);
    /* the sandbox keeps its own bindings — a carrier missing from them makes that
       world's sandbox a board nothing can be placed on. The Deep shipped that way once. */
    assert.ok(mine.some(([k]) => g.sandMeta.unlocked[k]),
      `${world}: no carrier in the sandbox bindings — its sandbox would be unplayable`);
  }
});
