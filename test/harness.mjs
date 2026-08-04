/* Boots Conquest headlessly and hands back its innards.
 *
 * Two things make this fast and repeatable where driving a browser was neither:
 * Math.random is seeded, and time is injected — nothing waits on a real clock.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makeDocument } from "./dom.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME = join(HERE, "..", "index.html");

/* mulberry32 — small, fast, and the same sequence every run */
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function silentAudio() {
  const node = new Proxy({}, {
    get(_t, k) {
      if (k === "value") return 0;
      if (k === "then") return undefined;
      return () => node;
    },
    set() { return true; }
  });
  class AudioContextStub {
    constructor() {
      this.currentTime = 0;
      this.state = "running";
      this.destination = node;
      this.sampleRate = 44100;
    }
    createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createOscillator() { return { frequency: { value: 440, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, type: "sine", connect() {}, start() {}, stop() {}, disconnect() {} }; }
    createBiquadFilter() { return { frequency: { value: 0, setValueAtTime() {} }, Q: { value: 1 }, type: "lowpass", connect() {}, disconnect() {} }; }
    createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {}, disconnect() {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(1024) }; }
    createConvolver() { return { buffer: null, connect() {}, disconnect() {} }; }
    createDelay() { return { delayTime: { value: 0 }, connect() {}, disconnect() {} }; }
    createDynamicsCompressor() { return { connect() {}, disconnect() {}, threshold: { value: 0 }, ratio: { value: 1 }, knee: { value: 0 }, attack: { value: 0 }, release: { value: 0 } }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  return AudioContextStub;
}

/* Pull the game's script out of the single-file build. It is the last and by far
   the largest <script> block; anything smaller is a shim we do not want. */
function extractScript(html) {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1]);
  if (!blocks.length) throw new Error("no inline <script> found in index.html");
  return blocks.reduce((a, b) => (b.length > a.length ? b : a));
}

export function boot({ seed = 1234 } = {}) {
  const html = readFileSync(GAME, "utf8");
  const code = extractScript(html);

  const document = makeDocument();
  const rand = seeded(seed);

  const window = {
    __CONQUEST_TEST__: true,
    document,
    innerWidth: 1200,
    innerHeight: 900,
    devicePixelRatio: 1,
    AudioContext: silentAudio(),
    matchMedia: () => ({ matches: false, addListener() {}, removeListener() {},
                         addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    /* the game's loop never runs on its own here — tests call step() instead */
    requestAnimationFrame() { return 0; },
    cancelAnimationFrame() {},
    setTimeout() { return 0; },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    performance: { now: () => 0 }
  };
  window.window = window;
  window.self = window;
  window.webkitAudioContext = window.AudioContext;

  const names = ["window", "document", "requestAnimationFrame", "cancelAnimationFrame",
    "setTimeout", "clearTimeout", "setInterval", "clearInterval", "AudioContext",
    "webkitAudioContext", "navigator", "performance", "getComputedStyle", "matchMedia",
    "localStorage", "Math"];
  const shimMath = Object.create(Math);
  shimMath.random = rand;

  const values = [window, document, window.requestAnimationFrame, window.cancelAnimationFrame,
    window.setTimeout, window.clearTimeout, window.setInterval, window.clearInterval,
    window.AudioContext, window.webkitAudioContext, { userAgent: "node" }, window.performance,
    window.getComputedStyle, window.matchMedia, window.localStorage, shimMath];

  // eslint-disable-next-line no-new-func
  new Function(...names, code)(...values);

  if (!window.__game) throw new Error("the test seam did not publish window.__game");
  const g = window.__game;
  g.document = document;
  g.rand = rand;
  return g;
}

/* Most suites want one boot and no per-test cost. */
let shared = null;
export function game() {
  if (!shared) shared = boot();
  return shared;
}
