/* The rules panels keep an enemy's block shut until one of that kind has been
 * put down. The stub DOM never parses the page markup, so the blocks are stood
 * up by hand here — what is under test is refreshLore's decision and the
 * selector that carries it, not the shipped HTML.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { boot } from "./harness.mjs";

function loreNode(g, foe) {
  const el = g.document.createElement("div");
  el.className = "lore hidden";
  el.setAttribute("data-foe", foe);
  g.document.body.appendChild(el);
  return el;
}

test("a lore block opens for a beaten enemy and stays shut for an unmet one", () => {
  const g = boot();
  const digger = loreNode(g, "digger");
  const glob = loreNode(g, "glob");

  g.meta.foesBeaten.digger = 1;
  g.refreshLore();

  assert.equal(digger.classList.contains("hidden"), false, "a beaten enemy's lore stayed shut");
  assert.equal(glob.classList.contains("hidden"), true, "an unmet enemy's lore was shown");
});

test("meeting the enemy later opens the block that was shut", () => {
  const g = boot();
  const node = loreNode(g, "stormhead");

  g.refreshLore();
  assert.equal(node.classList.contains("hidden"), true);

  g.meta.foesBeaten.stormhead = 1;
  g.refreshLore();
  assert.equal(node.classList.contains("hidden"), false);
});

test("the blocks in the shipped page name only real enemies", () => {
  /* the markup itself is not booted here, so read it directly — a lore block
     gated on a misspelled foe would simply never open */
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const g = boot();
  const foes = [...html.matchAll(/data-foe="([^"]+)"/g)].map(m => m[1]);
  assert.ok(foes.length >= 5, "expected the rules panels to carry lore blocks");
  for (const f of foes) assert.ok(g.FOES[f], `lore block gated on unknown foe "${f}"`);
});
