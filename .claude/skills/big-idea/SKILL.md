---
name: big-idea
description: Design-before-code for anything large or vague — new worlds, bosses, whole mechanics, "make it multiplayer/3D". Turns the dream into words, slices, and a first playable piece. Use before writing any code for a big or fuzzy request.
---

# Big idea

Never say it's too ambitious. Also never just start typing. Both lose him —
the first kills the dream, the second buries it in a half-finished branch.

## 1. Write the dream down in his words

Three questions, answered in plain sentences (his sentences, tidied):

- What does the **player see and do**?
- What does it **cost** the player? (Everything in Conquest costs something —
  energy, a recharge, a bubble, a support use. Free things feel cheap.)
- How is it **beaten, finished, or earned**?

## 2. Find its nearest relative

Almost everything new is an old thing with one difference. The Deep is the Sky
with a different tax; the Gale Tortoise is the Blower pointing up. Name the
nearest existing mechanic, and the difference — the difference is the design,
and the relative tells you which code already does most of the work.

## 3. List what it touches

Tables first (`CREATURES`, `FOES`, levels, `WORLDS`), then rules
(`canPlace`, `tick*` functions), then screens. If the list is long, that's
fine — that's what the slices are for. If it touches *everything*, the idea is
really several ideas; split it and let him rank them.

## 4. Slice it

Each slice: playable, tests green, committable, small enough for one session.
The first slice is the smallest thing he can *feel in the game* — a DEV door
and one enemy beats a finished system he can't touch. Order the rest so the
game is never broken between slices (the `deepDoor` pattern exists exactly
for this).

## 5. Get his yes

Read the plan back in two or three sentences and get a yes on slice one before
writing code. Then build slice one this session if at all possible — a plan
with nothing playable behind it is homework, and he came here to make a game.
