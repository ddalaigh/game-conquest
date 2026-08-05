---
name: ship
description: The finish line, in order — tests, a plain-words commit, and (when he wants the world to see it) the push that updates the live site. Use for "commit", "save this", "push", "put it on the site", or when a slice of work is done.
---

# Ship it

Run the line in order. Skipping steps is how broken games reach the internet.

## 1. Tests

`./test/run.sh` — about five seconds. Red means stop: fix or `/fix-a-bug`,
never ship red. If a red test is *wrong about the game now* (a curve promise a
new level deliberately changes), changing the test is allowed — out loud, with
him, and the commit says so.

## 2. Trust the tests — and widen them when they're blind

No browser playthrough — that verification loop is too slow (dad's rule).
If the change isn't visible to the suite — a screen, a toast, a sound —
that's the gap to close: extend the seam, add a counter or a log, and leave
an assertion behind. Opening the game for *him* is still welcome any time —
a test suite cannot feel whether something is fun — but his eyes are design
review, not the gate.

## 3. Look in the box

`git status` and `git diff --stat`, narrated in one line ("we're saving the new
enemy, its level, and two tests"). Stray files (screenshots, scratch scripts)
stay out.

## 4. Save point

Commit with a plain-words message about the *game*: "Add the Lantern Fish",
"Deep 3 teaches trenches", "Fix: arrows skipped the tortoise at 4× speed".
Not "update index.html". One working slice, one commit. Never rewrite history,
never force-push.

## 5. Publish — when he means to

`git push` puts it on the live site (GitHub Pages) for anyone with the link.
So, before pushing: tests were green, and for big or strange changes dad has
seen it. Committing without pushing is a fine place to
stop a session — say so, so unpushed work doesn't feel unfinished.

## 6. Say what shipped

One sentence, the player's view: "The Deep has a fifth level now, and it's
mean." He should end every session knowing exactly what got made.
