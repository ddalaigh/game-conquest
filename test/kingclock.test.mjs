/* The king's clock.
 *
 * Time is injected, so the speedrun timer counts game-time — the same run
 * gives the same time at any playback speed, and these tests can demand
 * exact numbers. kingResult decides the end-screen line and keeps the
 * session best; the HUD clock is only its face.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";

test("fmtTime speaks minutes, seconds and tenths", () => {
  const g = boot();
  assert.equal(g.fmtTime(0), "0:00.0");
  assert.equal(g.fmtTime(59_999), "0:59.9");
  assert.equal(g.fmtTime(103_250), "1:43.2");
  assert.equal(g.fmtTime(725_900), "12:05.9");
});

test("the clock counts injected time exactly, and restarts with the level", () => {
  const g = boot();
  g.startLevel("caves", 15, false);
  for (let i = 0; i < 100; i++) g.step(16);
  assert.equal(g.levelMsNow(), 1600);
  g.step(400);
  assert.equal(g.levelMsNow(), 2000);
  g.startLevel("caves", 15, false);
  assert.equal(g.levelMsNow(), 0, "a new attempt starts from zero");
});

test("kingResult keeps the best and says the right line", () => {
  const g = boot();
  assert.equal(g.meta.bestKing, 0, "no record until a king has fallen");
  const first = g.kingResult(103_250);
  assert.match(first, /fell in 1:43\.2/);
  assert.match(first, /Your fastest yet/);
  assert.equal(g.meta.bestKing, 103_250);

  const slower = g.kingResult(120_000);
  assert.match(slower, /fell in 2:00\.0/);
  assert.match(slower, /fastest stands at 1:43\.2/);
  assert.equal(g.meta.bestKing, 103_250, "a slower run does not touch the record");

  const faster = g.kingResult(90_100);
  assert.match(faster, /Your fastest yet/);
  assert.equal(g.meta.bestKing, 90_100);
});
