/* A DOM small enough to run Conquest and nothing more.
 *
 * The tests assert on the game's own JavaScript state — grid, foes, energy — never
 * on rendered output, so this only has to be faithful enough that the game runs
 * without throwing. Where fidelity would cost real work (layout, cascade, real
 * parsing) it does the cheap thing on purpose.
 */

const VOID_TAGS = new Set(["br", "img", "input", "hr", "meta", "link", "use", "path",
  "circle", "ellipse", "rect", "stop", "line", "polygon"]);

/* A deliberately rough HTML/SVG parser. It gets tag names, attributes and nesting
 * right, which is all querySelector needs; text content is kept as a flat string. */
function parseHTML(html, doc) {
  const out = [];
  const stack = [];
  const re = /<\/?([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [raw, tag, attrs] = m;
    const closing = raw[1] === "/";
    const selfClosing = /\/\s*$/.test(attrs) || VOID_TAGS.has(tag.toLowerCase());
    if (closing) {
      if (stack.length) stack.pop();
      continue;
    }
    const el = doc.createElement(tag);
    const are = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a;
    while ((a = are.exec(attrs)) !== null) {
      el.setAttribute(a[1], a[3] !== undefined ? a[3] : a[4]);
    }
    if (stack.length) stack[stack.length - 1].appendChild(el);
    else out.push(el);
    if (!selfClosing) stack.push(el);
  }
  return out;
}

/* Supports the selector shapes the game actually uses: "tag", ".cls", "#id",
 * "[attr]", '[attr="v"]', compounds of those with no space (".lore[data-foe]"),
 * and space-separated descendant chains of any of them. */
function matchesSimple(el, sel) {
  const m = /^([a-zA-Z][\w-]*|\*)?((?:[.#][\w-]+|\[[^\]]*\])*)$/.exec(sel);
  if (!m || (!m[1] && !m[2])) return false;
  if (m[1] && m[1] !== "*" && el.tagName.toLowerCase() !== m[1].toLowerCase()) return false;
  for (const chunk of m[2] ? m[2].match(/[.#][\w-]+|\[[^\]]*\]/g) || [] : []) {
    if (chunk[0] === ".") {
      if (!el.classList.contains(chunk.slice(1))) return false;
    } else if (chunk[0] === "#") {
      if (el.id !== chunk.slice(1)) return false;
    } else {
      const a = /^\[([\w:-]+)(?:=["']?([^\]"']*)["']?)?\]$/.exec(chunk);
      if (!a) return false;
      const v = el.getAttribute(a[1]);
      if (v === null) return false;
      if (a[2] !== undefined && v !== a[2]) return false;
    }
  }
  return true;
}

function descendants(el, acc = []) {
  for (const c of el.children) { acc.push(c); descendants(c, acc); }
  return acc;
}

function queryAll(root, selector) {
  /* commas first, then descendant chains */
  const groups = selector.split(",").map(s => s.trim()).filter(Boolean);
  const hits = new Set();
  for (const g of groups) {
    const parts = g.split(/\s+/);
    let pool = descendants(root);
    for (let i = 0; i < parts.length; i++) {
      pool = pool.filter(el => matchesSimple(el, parts[i]));
      /* indexOf(part) here once broke chains with a repeated token ("div div") */
      if (i < parts.length - 1) pool = pool.flatMap(el => descendants(el));
    }
    pool.forEach(el => hits.add(el));
  }
  return [...hits];
}

class ClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  add(...cs) { cs.forEach(c => c && this.set.add(c)); this.sync(); }
  remove(...cs) { cs.forEach(c => this.set.delete(c)); this.sync(); }
  contains(c) { return this.set.has(c); }
  toggle(c, force) {
    const on = force === undefined ? !this.set.has(c) : !!force;
    if (on) this.set.add(c); else this.set.delete(c);
    this.sync();
    return on;
  }
  sync() { this.el._className = [...this.set].join(" "); }
}

class Element {
  constructor(tagName, doc) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parentNode = null;
    this.attributes = Object.create(null);
    this.style = new Proxy({ setProperty(k, v) { this[k] = v; },
                             removeProperty(k) { delete this[k]; } }, {});
    this._className = "";
    this.classList = new ClassList(this);
    this._text = "";
    this._html = "";
    this.listeners = Object.create(null);
    this.disabled = false;
    this.id = "";
  }
  get className() { return this._className; }
  set className(v) {
    this._className = v || "";
    this.classList.set = new Set(String(v || "").split(/\s+/).filter(Boolean));
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this.children = []; this._html = ""; }
  get innerHTML() { return this._html; }
  set innerHTML(v) {
    this._html = String(v);
    this.children = [];
    if (this._html) {
      for (const c of parseHTML(this._html, this.ownerDocument)) {
        c.parentNode = this;
        this.children.push(c);
      }
    }
  }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }
  appendChild(c) {
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    this.children.push(c);
    return c;
  }
  removeChild(c) {
    const i = this.children.indexOf(c);
    if (i > -1) this.children.splice(i, 1);
    c.parentNode = null;
    return c;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  insertAdjacentHTML(_pos, html) {
    for (const c of parseHTML(String(html), this.ownerDocument)) {
      c.parentNode = this;
      this.children.unshift(c);
    }
  }
  cloneNode() {
    const el = new Element(this.tagName, this.ownerDocument);
    el.className = this._className;
    el.innerHTML = this._html;
    Object.assign(el.attributes, this.attributes);
    return el;
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === "id") this.id = String(v);
    if (k === "class") this.className = String(v);
  }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return k in this.attributes; }
  querySelector(sel) { return queryAll(this, sel)[0] || null; }
  querySelectorAll(sel) { return queryAll(this, sel); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) {
    const l = this.listeners[type];
    if (l) this.listeners[type] = l.filter(f => f !== fn);
  }
  /* the game only ever dispatches clicks, and only from tests */
  click() { (this.listeners.click || []).forEach(fn => fn.call(this, { target: this })); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 620, height: 380, right: 620, bottom: 380 }; }
}

class Document extends Element {
  constructor() {
    super("#document", null);
    this.ownerDocument = this;
    this.byId = new Map();
  }
  createElement(tag) { return new Element(tag, this); }
  createElementNS(_ns, tag) { return new Element(tag, this); }
  /* The game asks for ids that live in the markup. Rather than parse 700 lines of
     HTML we hand back a stable stub per id — the tests never assert on layout, and
     a missing element would only ever show up as a crash. */
  getElementById(id) {
    if (!this.byId.has(id)) {
      const el = new Element("div", this);
      el.id = id;
      this.byId.set(id, el);
      this.body.appendChild(el);
    }
    return this.byId.get(id);
  }
}

export function makeDocument() {
  const doc = new Document();
  doc.body = new Element("body", doc);
  doc.body.parentNode = doc;
  doc.children.push(doc.body);
  doc.documentElement = doc.body;
  return doc;
}

export { Element };
