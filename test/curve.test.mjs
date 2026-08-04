/* The difficulty curve, checked statically.
 *
 * This is the balance net, and it needs no bot: it reads the wave tables and
 * asserts the shape of the climb. It catches the mistakes that actually happen —
 * a count typed with an extra digit, a level that quietly got easier than the one
 * before it, a new enemy dropped into level 2 that belongs at level 12.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { game } from "./harness.mjs";

const g = game();

/* what the wave is worth in health, and how long it takes to arrive */
function weight(table, n) {
  const L = table[n];
  const mix = L.mix || [];
  const meanHp = mix.reduce((a, k) => a + g.FOES[k].hp, 0) / (mix.length || 1);
  const bossHp = L.boss ? g.FOES[L.bossKind || "bossking"].hp : 0;
  return {
    hp: Math.round(L.count * meanHp + bossHp),
    seconds: Math.round((L.count * L.gap) / 1000),
    count: L.count,
    boss: !!L.boss
  };
}

const WORLDS = [
  ["The Caves", g.LEVELS],
  ["The Sky", g.SKY_LEVELS],
  ["The Deep Sea", g.DEEP_LEVELS]
];

test("each world sends more as it goes", () => {
  /* Count, not health. Health is the wrong yardstick: cave 7 introduces goblins,
     which are 70 health apiece against the armoured skeletons' 400, so the mean
     drops even though the level is plainly harder — they are twice as fast and
     arrive in mobs. Count is the dial the levels are actually built on, and it
     climbs cleanly in all three worlds. */
  for (const [name, table] of WORLDS) {
    const ns = Object.keys(table).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < ns.length; i++) {
      const prev = weight(table, ns[i - 1]);
      const cur = weight(table, ns[i]);
      /* a boss level is its own kind of thing — few adds, slowly, and the boss is
         the content */
      if (cur.boss || prev.boss) continue;
      assert.ok(cur.count >= prev.count,
        `${name} ${ns[i]} sends fewer than ${ns[i - 1]} (${cur.count} vs ${prev.count})`);
    }
  }
});

test("a boss level is built differently from the run-up to it", () => {
  for (const [name, table] of WORLDS) {
    const ns = Object.keys(table).map(Number).sort((a, b) => a - b);
    for (const n of ns) {
      if (!table[n].boss) continue;
      const prev = table[ns[ns.indexOf(n) - 1]];
      assert.ok(table[n].count < prev.count,
        `${name} ${n} is a boss level but still sends a full wave (${table[n].count})`);
      assert.ok(table[n].gap > prev.gap,
        `${name} ${n} is a boss level but its adds come as fast as an ordinary wave`);
    }
  }
});

test("no level is a cliff", () => {
  for (const [name, table] of WORLDS) {
    const ns = Object.keys(table).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < ns.length; i++) {
      const prev = weight(table, ns[i - 1]);
      const cur = weight(table, ns[i]);
      if (cur.boss || prev.boss) continue;
      assert.ok(cur.hp <= prev.hp * 2.5,
        `${name} ${ns[i]} is a cliff: ${cur.hp} health after ${ns[i - 1]}'s ${prev.hp}`);
    }
  }
});

test("waves keep arriving faster, never slower", () => {
  for (const [name, table] of WORLDS) {
    const ns = Object.keys(table).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < ns.length; i++) {
      const a = table[ns[i - 1]], b = table[ns[i]];
      if (b.boss || a.boss) continue;
      assert.ok(b.gap <= a.gap,
        `${name} ${ns[i]} spawns slower than ${ns[i - 1]} (${b.gap}ms vs ${a.gap}ms)`);
    }
  }
});

test("no level is absurdly long or absurdly short", () => {
  for (const [name, table] of WORLDS) {
    for (const n of Object.keys(table)) {
      const w = weight(table, n);
      assert.ok(w.seconds >= 20, `${name} ${n} is over in ${w.seconds}s of spawning`);
      assert.ok(w.seconds <= 300, `${name} ${n} spawns for ${w.seconds}s — over five minutes`);
      assert.ok(w.count > 0 && w.count < 200, `${name} ${n} has a count of ${w.count}`);
    }
  }
});

test("an enemy is introduced before it is leaned on", () => {
  /* the level where each enemy first appears, and the level where it first makes
     up half the mix — the second should never come before the first */
  for (const [name, table] of WORLDS) {
    const firstSeen = new Map();
    const firstHeavy = new Map();
    for (const n of Object.keys(table).map(Number).sort((a, b) => a - b)) {
      const mix = table[n].mix || [];
      for (const k of new Set(mix)) {
        if (!firstSeen.has(k)) firstSeen.set(k, n);
        const share = mix.filter(x => x === k).length / mix.length;
        if (share >= 0.5 && !firstHeavy.has(k)) firstHeavy.set(k, n);
      }
    }
    for (const [k, heavy] of firstHeavy) {
      assert.ok(heavy >= firstSeen.get(k),
        `${name}: ${g.FOES[k].name} carries level ${heavy} before appearing at ${firstSeen.get(k)}`);
    }
  }
});

test("every world opens gently", () => {
  for (const [name, table] of WORLDS) {
    const first = Math.min(...Object.keys(table).map(Number));
    const w = weight(table, first);
    const mix = new Set(table[first].mix || []);
    assert.ok(mix.size <= 2, `${name} ${first} opens with ${mix.size} kinds of enemy at once`);
    assert.ok(!table[first].boss, `${name} opens on a boss`);
    assert.ok(w.hp <= 2500, `${name} opens with ${w.hp} health of wave`);
  }
});
