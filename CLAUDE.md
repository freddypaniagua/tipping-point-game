# Tipping Point (working title)

A daily browser estimation game. Each day every player gets the same 5 "weigh-ins": guess how many of one object (e.g. blue whales) it takes to balance another (e.g. the Eiffel Tower) on a scale. The full design lives in `DESIGN.md` — read it before making product or gameplay decisions.

## The feel we're going for
- "I'm clever and I just learned something wild" — a brain game, not a dopamine slot machine.
- Fluid, satisfying animation is core, not polish. Reference feel: Krillion's dive animation, Klifur's squishy physics.
- 2–4 minutes per day. No ads or popups between the player and the game.

## Locked decisions (don't change without asking)
- 5 weigh-ins per day, same set for everyone, difficulty rising from 1 to 5.
- One shot per weigh-in, no undo.
- After commit: the chosen number of objects multiplies onto the right pan, the beam swings, wobbles (~1s) and settles. Too many → right pan sinks; too few → it lifts.
- The scale tilts only according to the player's guess. Nothing marks the true balance point during the suspense. The real answer and a fun fact appear only after it settles. No "correct/wrong" text.
- Scoring is ratio-based: error = |log10(guess / answer)|. Starting bands: within 10% = 100, 1.5x = 75, 3x = 50, 10x = 20, worse = 0. All weigh-ins worth equal points.
- Content comes from our own curated object database (weights stored in kg, sources kept internally, not shown to players).

## Still open (ask before assuming)
- Input: brass dial (snapping 1, 2, 3, 5, 10, 20, 30, 50…) vs keyboard vs hybrid. Build mock-ups to compare.
- Visual world (Victorian brass lab vs modern minimal vs other), share card design, final name.
- Weight only, or later add height/time instruments.

## Tech direction
- Static site, mobile-first, deployable to GitHub Pages. Plain JS or a light framework; keep dependencies minimal.
- Scale and objects in SVG or canvas; a small tweening/physics library is fine.
- Objects in a JSON file; daily set chosen by date from a pre-shuffled list.
- Stats/streaks in localStorage for now.
- Large counts: don't render thousands of sprites — use a growing pile + counter, or crates ("x100").

## Current milestone
Prototype one hard-coded weigh-in (Eiffel Tower vs blue whales) with input, commit, the multiply/swing/settle animation, reveal and scoring. Then chain 5 weigh-ins into a results screen. See the checklist in `DESIGN.md`.

## Working style
- This repo is public and on my resume: small focused commits with clear messages, readable code, short comments where logic isn't obvious.
- Explain notable design/tech choices briefly so I understand and can talk about them in interviews.
