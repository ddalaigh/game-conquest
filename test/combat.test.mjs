/* The Blower turns arrows, the Gale turns airship shells, and neither does the
 * other's job. Four cases that previously cost four rounds of clicking. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

const ARROW_DMG = 20;
const SHELL_DMG = 50;

function board() {
  const g = boot();
  for (const k of ["blowertortoise", "galetortoise", "forge"]) g.meta.unlocked[k] = 1;
  g.startLevel("caves", 1, false);
  g.setEnergy(9999);
  g.clearCooldowns();
  return g;
}

function put(g, key, r, c) {
  g.clearCooldowns();
  g.select(key);
  g.click(r, c);
  return g.state().grid[r][c].unit;
}

/* run the projectile list until it settles, with an explicit clock */
function settle(g, frames = 200) {
  for (let i = 0; i < frames; i++) g.tickArrows(16);
}

function liveArrows(g) { return g.state().arrows; }

test("an arrow is turned back by a Blower Tortoise", () => {
  const g = board();
  const row = 2, col = 4;
  const wall = put(g, "blowertortoise", row, col);
  assert.ok(wall, "could not place the wall");
  const hp0 = wall.hp;

  g.makeArrow(row, g.midX(col) + 60, ARROW_DMG);
  const shot = liveArrows(g)[liveArrows(g).length - 1];

  for (let i = 0; i < 60 && !shot.back; i++) g.tickArrows(16);

  assert.equal(shot.back, true, "the arrow was not turned");
  assert.equal(wall.hp, hp0, "the wall took damage from an arrow it should have turned");
});

test("a shell passes straight over a Blower Tortoise", () => {
  const g = board();
  const row = 1, wallCol = 4, backCol = 1;
  put(g, "blowertortoise", row, wallCol);
  const behind = put(g, "forge", row, backCol);
  assert.ok(behind, "could not place the back line");
  const hp0 = behind.hp;

  g.makeShell(row, g.midX(wallCol) + 80, SHELL_DMG, g.midX(backCol));
  const shell = liveArrows(g)[liveArrows(g).length - 1];
  settle(g);

  assert.notEqual(shell.back, true, "the Blower turned a shell, which is the Gale's job");
  assert.equal(behind.hp, hp0 - SHELL_DMG, "the shell did not land on the back line");
});

test("a shell is turned back by a Gale Tortoise", () => {
  const g = board();
  const row = 3, wallCol = 4, backCol = 1;
  put(g, "galetortoise", row, wallCol);
  const behind = put(g, "forge", row, backCol);
  const hp0 = behind.hp;

  g.makeShell(row, g.midX(wallCol) + 80, SHELL_DMG, g.midX(backCol));
  const shell = liveArrows(g)[liveArrows(g).length - 1];

  for (let i = 0; i < 60 && !shell.back; i++) g.tickArrows(16);

  assert.equal(shell.back, true, "the Gale did not turn the shell");
  assert.equal(behind.hp, hp0, "the back line was hit anyway");
});

test("an arrow goes straight through a Gale Tortoise", () => {
  const g = board();
  const row = 0, col = 4;
  const wall = put(g, "galetortoise", row, col);
  const hp0 = wall.hp;

  g.makeArrow(row, g.midX(col) + 60, ARROW_DMG);
  const shot = liveArrows(g)[liveArrows(g).length - 1];
  settle(g);

  assert.notEqual(shot.back, true, "the Gale turned an arrow, which is the Blower's job");
  assert.equal(wall.hp, hp0 - ARROW_DMG, "the arrow did not land");
});

test("a turned shot carries its damage into the enemy that fired it", () => {
  const g = board();
  const row = 2, col = 4;
  put(g, "blowertortoise", row, col);
  const foe = g.spawnFoe("archer", row, g.midX(col) + 120);
  const hp0 = foe.hp;

  g.makeArrow(row, g.midX(col) + 60, ARROW_DMG);
  settle(g);

  assert.equal(foe.hp, hp0 - ARROW_DMG, "the returned arrow did not hit the archer");
});

test("a turned shot leaves the board rather than lingering", () => {
  const g = board();
  const row = 4, col = 4;
  put(g, "blowertortoise", row, col);
  g.makeArrow(row, g.midX(col) + 60, ARROW_DMG);
  settle(g, 400);
  assert.equal(liveArrows(g).length, 0, "a returned arrow is still in flight");
});

/* ---- the Bubble Dancer. It walks in like anything else — always the middle
   lane — stops on the bubble column to dance, and its dark bubbles shield the
   first enemy through each. The Deep's rules are proved in the sandbox, same
   as the placement suite. ---- */

function deepBoard() {
  const g = boot();
  g.startLevel("deep", 1, true);
  return g;
}

/* walk a fresh Dancer in until its dance has ended and the bubbles are down */
function danceOver(g, d, kind = "bubbledancer") {
  const z = g.spawnFoe(kind);
  let guard = 0;
  while (!z.danced && guard++ < 900) g.step(100);
  return z;
}

test("the Bubble Dancer walks the middle lane and stops at its tile to dance", () => {
  const g = deepBoard();
  const d = g.FOES.bubbledancer.dance;
  const z = g.spawnFoe("bubbledancer");
  assert.equal(z.row, d.row, "it did not take the middle lane");
  assert.ok(z.x > g.midX(g.COLS - 1), "it did not walk in from the edge like the others");
  let guard = 0;
  while (!z.dancing && guard++ < 900) g.step(100);
  assert.ok(z.dancing > 0, "it never stopped to dance");
  assert.ok(Math.abs(z.x - g.midX(g.COLS - 1)) < 12,
    "it did not dance on its first tile — the water's edge, where the designer put it");
  assert.equal(g.state().grid[0][d.bubbleCol].darkBubble || false, false, "bubbles came early");
  const xd = z.x;
  g.step(d.windup - 200);
  assert.equal(z.x, xd, "it walked mid-dance");
  g.step(400);
  let bubbles = 0;
  for (let r = 0; r < g.ROWS; r++) if (g.state().grid[r][d.bubbleCol].darkBubble) bubbles++;
  assert.equal(bubbles, g.ROWS, "the dance did not leave a bubble in every lane");
  g.step(600);
  assert.ok(z.x < xd, "it never walked on after the dance");
});

test("a Dancer killed on the walk or mid-dance leaves no bubbles", () => {
  const g = deepBoard();
  const d = g.FOES.bubbledancer.dance;
  const z = g.spawnFoe("bubbledancer");
  let guard = 0;
  while (!z.dancing && guard++ < 900) g.step(100);
  g.step(d.windup / 2);
  g.hurtFoe(z, 9999);
  g.step(d.windup);
  let bubbles = 0;
  for (let r = 0; r < g.ROWS; r++) if (g.state().grid[r][d.bubbleCol].darkBubble) bubbles++;
  assert.equal(bubbles, 0, "a dead Dancer still finished its dance");
});

test("the first enemy through a dark bubble takes the shield, and the bubble pops", () => {
  const g = deepBoard();
  const d = g.FOES.bubbledancer.dance;
  danceOver(g, d);
  const row = 0;
  const first = g.spawnFoe("drowned", row, g.midX(d.bubbleCol) + 40);
  let guard = 0;
  while (!first.shield && guard++ < 100) g.step(50);
  assert.equal(first.shield, d.shield, "the shield was not picked up");
  assert.equal(g.state().grid[row][d.bubbleCol].darkBubble, false, "the bubble did not pop");
  const second = g.spawnFoe("drowned", row, g.midX(d.bubbleCol) + 40);
  for (let i = 0; i < 80; i++) g.step(50);
  assert.ok(!second.shield, "a popped bubble shielded a second enemy");
});

test("the shield soaks damage before health, then breaks", () => {
  const g = deepBoard();
  const d = g.FOES.bubbledancer.dance;
  danceOver(g, d);
  const z = g.spawnFoe("drowned", 1, g.midX(d.bubbleCol) + 40);
  let guard = 0;
  while (!z.shield && guard++ < 100) g.step(50);
  const hp0 = z.hp;
  g.hurtFoe(z, 20);
  assert.equal(z.hp, hp0, "damage reached health through the shield");
  assert.equal(z.shield, d.shield - 20, "the shield did not soak the hit");
  g.hurtFoe(z, 20);
  assert.equal(z.shield, 0, "the shield did not break");
  assert.equal(z.hp, hp0 - 10, "the overflow did not carry into health");
});

/* ---- the kelp army. The Mystic Kelp Phoenix grows green copies of the old
   enemies that march the other way and fight for the player. ---- */

test("the Mystic Kelp Phoenix grows a soldier every ten seconds, from the pool", () => {
  const g = boot();
  g.startLevel("caves", 1, true);        /* sandbox: no wave in the way */
  g.addUnit(2, 1, "kelpphoenix");
  const every = g.CREATURES.kelpphoenix.kelp.every;
  g.step(every - 200);
  assert.equal(g.state().kelps.length, 0, "a soldier rose early");
  g.step(400);
  assert.equal(g.state().kelps.length, 1, "no soldier rose on the clock");
  const pool = g.CREATURES.kelpphoenix.kelp.pool;
  assert.ok(pool.includes(g.state().kelps[0].kind),
    `it grew "${g.state().kelps[0].kind}", which is not in the designer's pool`);
  g.step(every);
  assert.equal(g.state().kelps.length, 2, "the clock stopped after one");
});

test("a kelp soldier marches at the enemy and both sides bleed", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  const k = g.spawnKelp("skeleton", 1, g.midX(1));
  const z = g.spawnFoe("skeleton", 1, g.midX(4));
  const kh = k.hp, zh = z.hp;
  for (let i = 0; i < 400 && (z.hp === zh || k.hp === kh); i++) g.step(50);
  assert.ok(z.hp < zh, "the enemy was never bitten");
  assert.ok(k.hp < kh, "the enemy never bit back");
});

test("a kelp archer shoots the other way", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.spawnKelp("archer", 0, g.midX(1));
  const z = g.spawnFoe("armoured", 0, g.midX(3));
  const zh = z.hp;
  for (let i = 0; i < 200 && z.hp === zh; i++) g.step(50);
  assert.ok(z.hp < zh, "the kelp archer never landed a shot");
});

test("a kelp Brood Glob comes apart on your side", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  const k = g.spawnKelp("broodglob", 2, g.midX(2));
  g.hurtKelp(k, 9999);
  const kinds = g.state().kelps.map(x => x.kind);
  assert.equal(kinds.filter(x => x === "globling").length, 2,
    "the brood did not come apart into two kelp Globlings");
});

/* ---- the Drowned Riding Shark. It lurks untouchable under the seabed and
   surfaces to devour the frontmost creature whole. ---- */

test("the shark surfaces in front of the frontmost creature, eats once, and leaves", () => {
  const g = boot();
  g.startLevel("caves", 1, true);      /* sandbox board; the shark's rules are world-free */
  g.setEnergy(9999);                   /* the sandbox tops energy up per tick — no ticks yet */
  const back = put(g, "forge", 2, 1);
  const front = put(g, "tortoise", 1, 3);
  assert.ok(back && front, "could not set the table");
  const s = g.spawnFoe("drownshark");
  assert.equal(s.underground, true, "the shark did not start under the seabed");
  let guard = 0;
  while (s.underground && guard++ < 200) g.step(100);
  assert.ok(!s.underground, "the shark never surfaced");
  assert.equal(s.row, 1, "it surfaced in the wrong lane");
  assert.ok(Math.abs(s.x - g.midX(4)) < 2,
    "it did not surface one tile in front of its prey");
  assert.ok(g.state().grid[1][3].unit, "it ate before the windup");
  g.step(800);                          /* the windup passes, the chomp lands */
  assert.equal(g.state().grid[1][3].unit, null, "the creature was not devoured");
  assert.ok(g.state().grid[2][1].unit, "it ate the wrong creature");
  g.step(1600);                         /* it lingers its heartbeat, then leaves for good */
  assert.equal(g.state().foes.length, 0, "the shark did not leave after its one meal");
});

test("the shark cannot be hurt under the seabed, only while the water is broken", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.setEnergy(9999);
  put(g, "forge", 2, 2);
  const s = g.spawnFoe("drownshark");
  const hp0 = s.hp;
  g.hurtFoe(s, 50);
  assert.equal(s.hp, hp0, "it was wounded through the seabed");
  let guard = 0;
  while (s.underground && guard++ < 200) g.step(100);
  g.hurtFoe(s, 50);
  assert.equal(s.hp, hp0 - 50, "it could not be hurt while surfaced");
});

test("your creatures cannot see the shark while it lurks", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.setEnergy(9999);
  put(g, "drakeling", 2, 0);
  const s = g.spawnFoe("drownshark");
  for (let i = 0; i < 30; i++) g.step(100);          /* 3s — too soon for it to surface */
  assert.equal(s.underground, true, "it surfaced too early for this test to mean anything");
  assert.equal(g.state().bolts.length, 0, "a creature took aim at the hidden shark");
  /* the control: the same drakeling fires the moment something visible shows up */
  g.spawnFoe("drowned", 2, g.midX(4));
  let fired = false;
  for (let i = 0; i < 40 && !fired; i++) { g.step(100); fired = g.state().bolts.length > 0; }
  assert.ok(fired, "the drakeling would not shoot at anything — the gate itself is broken");
});

test("the Disco Bubble Dancer's bubbles hold twice the shield", () => {
  const g = deepBoard();
  const d = g.FOES.discodancer.dance;
  danceOver(g, d, "discodancer");
  const z = g.spawnFoe("drowned", 0, g.midX(d.bubbleCol) + 40);
  let guard = 0;
  while (!z.shield && guard++ < 100) g.step(50);
  assert.equal(z.shield, 60, "a disco bubble did not grant its 60");
});

test("the Sand Drowned walls two lanes ahead every twenty seconds", () => {
  const g = deepBoard();
  const s = g.FOES.sanddrowned.sand;
  g.spawnFoe("sanddrowned", 2, g.midX(4));
  const scan = () => {
    const out = [], grid = g.state().grid;
    for (let r = 0; r < g.ROWS; r++) for (let c = 0; c < g.COLS; c++)
      if (grid[r][c].sandBlock) out.push({ r, c, hp: grid[r][c].sandBlock.hp });
    return out;
  };
  g.step(s.every - 300);
  assert.equal(scan().length, 0, "sand flew early");
  g.step(600);
  const blocks = scan();
  assert.equal(blocks.length, s.lanes, "the wrong number of lanes got walled");
  assert.ok(blocks.every(b => b.hp === s.hp), "a block has the wrong toughness");
  assert.ok(blocks.every(b => b.c === blocks[0].c), "the blocks landed across different columns");
});

test("a sand block stops your shots until 80 damage breaks it", () => {
  const g = boot();
  g.startLevel("caves", 1, true);      /* the sand's rules are world-free */
  g.setEnergy(9999);
  const shooter = put(g, "drakeling", 2, 0);
  assert.ok(shooter, "could not place the shooter");
  g.makeSandBlock(2, 3, 80);
  const z = g.spawnFoe("skeleton", 2, g.midX(5));
  z.frozen = 9e9;                       /* hold it still, so only the wall matters */
  const hp0 = z.hp;
  for (let i = 0; i < 30; i++) g.step(100);   /* 3s of firing into the wall */
  assert.equal(z.hp, hp0, "a shot reached the enemy through the sand");
  let broke = false;
  for (let i = 0; i < 200 && !broke; i++) { g.step(100); broke = !g.state().grid[2][3].sandBlock; }
  assert.ok(broke, "the sand never broke");
  let hurt = false;
  for (let i = 0; i < 100 && !hurt; i++) { g.step(100); hurt = z.hp < hp0; }
  assert.ok(hurt, "the broken wall still stopped the shots");
});

test("a lone sand wall is still worth shooting", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.setEnergy(9999);
  put(g, "drakeling", 1, 0);
  g.makeSandBlock(1, 3, 80);
  let broke = false;
  for (let i = 0; i < 200 && !broke; i++) { g.step(100); broke = !g.state().grid[1][3].sandBlock; }
  assert.ok(broke, "with no enemy in range, nobody shot the wall down");
});

test("the Ruler's cannons bomb the lanes beside it, three by three, for 60", () => {
  const g = boot();
  g.startLevel("caves", 1, true);      /* the palace's rules are world-free */
  g.setEnergy(9999);
  const above = put(g, "forge", 1, 1);
  const below = put(g, "forge", 3, 1);
  assert.ok(above && below, "could not set the court");
  const s = g.spawnFoe("drownruler", 2);
  s.laneT = -9e9;                       /* pin its lane so above and below stay put */
  const spec = g.FOES.drownruler.cannons;
  const hp0 = above.hp;
  g.step(spec.every - 300);
  assert.equal(above.hp, hp0, "the cannons fired early");
  g.step(600);
  assert.equal(above.hp, hp0 - spec.dmg, "the lane above was not bombed");
  assert.equal(below.hp, hp0 - spec.dmg, "the lane below was not bombed");
});

test("every 35 seconds the lanes beside the palace are crushed flat", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.setEnergy(9999);
  const above = put(g, "forge", 1, 4);
  const below = put(g, "forge", 3, 4);
  const under = put(g, "forge", 2, 4);
  assert.ok(above && below && under, "could not set the court");
  const s = g.spawnFoe("drownruler", 2);
  s.laneT = -9e9;                        /* pin its lane */
  s.cannonT = -9e9;                      /* silence the cannons — this test is the crush */
  s.summonT = -9e9;                      /* and hold the court, so nothing chews the forges */
  g.step(35000 - 300);
  assert.ok(g.state().grid[1][4].unit && g.state().grid[3][4].unit, "crushed early");
  /* small beats — the wind-up must start in one tick and finish across others */
  for (let i = 0; i < 30; i++) g.step(100);
  assert.equal(g.state().grid[1][4].unit, null, "the lane above was not crushed");
  assert.equal(g.state().grid[3][4].unit, null, "the lane below was not crushed");
  assert.ok(g.state().grid[2][4].unit, "the palace's own shadow should be safe");
});

test("the Sandstone Dragon breathes sand three lanes wide", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.setEnergy(9999);
  const dragon = put(g, "sandstonedragon", 2, 1);
  assert.ok(dragon, "could not place the dragon");
  const rows = [1, 2, 3, 0].map(r => {
    const z = g.spawnFoe("skeleton", r, g.midX(3));
    z.frozen = 9e9;                     /* hold them in the breath */
    return z;
  });
  const hp0 = rows[0].hp;
  for (let i = 0; i < 20; i++) g.step(100);   /* two seconds of sand */
  assert.ok(rows[0].hp < hp0, "the lane above was not breathed on");
  assert.ok(rows[1].hp < hp0, "its own lane was not breathed on");
  assert.ok(rows[2].hp < hp0, "the lane below was not breathed on");
  assert.equal(rows[3].hp, hp0, "row zero is two lanes away and should stay dry");
});

test("the Corally Sprite hums through a five-by-five", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.setEnergy(9999);
  const plain = put(g, "drakeling", 0, 0);
  const boosted = put(g, "drakeling", 4, 0);
  assert.ok(plain && boosted, "could not place the drakelings");
  assert.ok(put(g, "corallysprite", 4, 2), "could not place the coral");
  /* two squares from the drakeling — the Ley Sprite's four-square touch would miss */
  const za = g.spawnFoe("armoured", 0, g.midX(3)); za.frozen = 9e9;
  const zb = g.spawnFoe("armoured", 4, g.midX(3)); zb.frozen = 9e9;
  const hp0 = za.hp;
  for (let i = 0; i < 60; i++) g.step(100);   /* six seconds of fire */
  const plainDmg = hp0 - za.hp, boostedDmg = hp0 - zb.hp;
  assert.ok(plainDmg > 0, "the control drakeling never fired");
  assert.ok(boostedDmg >= plainDmg + 20,
    `two squares out should still quicken — plain ${plainDmg}, boosted ${boostedDmg}`);
});

test("the Possessed Swim Gear's bubble pierces for 30 and bursts on the last for 60", () => {
  const g = boot();
  g.startLevel("caves", 1, true);
  g.setEnergy(9999);
  assert.ok(put(g, "possessedswimgear", 2, 0), "could not place the gear");
  const a = g.spawnFoe("armoured", 2, g.midX(2)); a.frozen = 9e9;
  const b = g.spawnFoe("armoured", 2, g.midX(3)); b.frozen = 9e9;
  const c = g.spawnFoe("armoured", 2, g.midX(4)); c.frozen = 9e9;
  const hp0 = a.hp;
  let guard = 0;
  while (hp0 - c.hp < 60 && guard++ < 80) g.step(50);   /* one bubble, through and burst */
  assert.equal(hp0 - a.hp, 30, "a pierced enemy should take 30");
  assert.equal(hp0 - b.hp, 30, "a pierced enemy should take 30");
  assert.equal(hp0 - c.hp, 60, "the last enemy touched should wear the burst for 60");
});

/* Enemies chew on a shared clock unless their row says otherwise. The Super
 * Speedy Swimmer Drowned is the first with its own — it eats at double speed. */
test("the Super Speedy Swimmer eats twice as fast as its cousins", () => {
  const g = board();
  const fast = put(g, "tortoise", 0, 4);
  const slow = put(g, "tortoise", 2, 4);
  assert.ok(fast && slow, "could not place the two walls");
  g.spawnFoe("speedyswimmer", 0, g.midX(4));
  g.spawnFoe("drowned", 2, g.midX(4));
  const hp0 = fast.hp;
  for (let i = 0; i < 20; i++) g.step(50);   /* one second, in even bites */
  assert.equal(hp0 - fast.hp, 40, "the swimmer should land two bites in a second");
  assert.equal(hp0 - slow.hp, 20, "an ordinary Drowned lands one");
});
