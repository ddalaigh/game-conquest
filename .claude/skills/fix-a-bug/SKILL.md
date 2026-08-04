---
name: fix-a-bug
description: Reproduce-first debugging for Conquest — replay the bug through the test seam or browser, explain the cause in one sentence, fix small, and leave behind the test that would have caught it. Use whenever something is broken, "weird", or "doesn't work".
---

# Fix a bug

## 1. Catch it before touching code

A bug you can replay on demand is half fixed — say that, then do it:

- **Headless first** when the bug is rules or numbers: boot through the seam
  (`test/harness.mjs` → `boot()`, then `startLevel`, `select`/`click`,
  `step(ms)`, `canPlace`, `outcome()`). Deterministic, milliseconds, and the
  reproduction script is already almost the regression test.
- **Browser** when the bug is visual or sound: open `index.html`, reproduce the
  clicks, read the console. Screenshot what's wrong so he sees what you see.
- If he reported it, get his reproduction in his words first: *what did you do,
  what did you expect, what happened instead?* Those three questions are the
  whole discipline — teach them by asking them.

## 2. Name the cause in one sentence

Before fixing, say what was actually wrong ("the arrow checks its column before
it moves, so at high speed it skips the tortoise") — if you can't say it in a
sentence, keep digging. Never fix by coincidence.

## 3. Fix small

The smallest change that makes the sentence false. Resist drive-by refactors;
note them for later instead.

## 4. Leave the trap set

Add the test that would have caught it — usually in the suite that owns the
area (`reasons`, `combat`, `placement`…), named after the *behavior*, not the
bug number. Run `./test/run.sh`: the new test passes now and failed before
(actually check that if the fix is subtle — flip the fix off mentally or
temporarily).

## 5. Commit

"Fix: <what the player would have noticed>". One bug, one commit.

Teaching beat, once per bug at most: the test outlives the fix — that's why we
write it even though the bug is already gone.
