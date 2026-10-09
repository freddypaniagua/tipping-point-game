# Tipping point (working title): Game Design Doc

Last updated Oct 8, 2026

## Overview

Tipping Point is a daily browser estimation game: each day you get 5 weigh-ins, and for each one you guess how many of one object it takes to balance another on an old scale. Example: how many blue whales balance the Eiffel Tower?

The feeling we want is "I'm clever, and I just learned something wild," not "I got lucky." Players should leave feeling they reasoned about scale, the way Krillion makes you feel creative and Farflung makes you feel worldly. It should never feel like wasted time.

Where the idea came from:

- **Krillion and Farflung** showed that these games are three choices stacked together: a mechanic (how you think), a domain (what you think about) and a metaphor (how the score feels). Both reuse the same rarity mechanic with different worlds.
- We wanted a mechanic players are less familiar with. Estimation exists as a genre, but raw-number Fermi games feel abstract. Comparing two real objects on a physical scale makes it concrete and visual.
- **Klifur** set the bar for feel: small, fluid, satisfying animations that make a simple action feel alive.

## Core loop

A day's game is 5 weigh-ins, played in order, one shot each, about 2 to 4 minutes total. Everyone in the world gets the same 5 pairs that day.

1. Open the game and see today's number and a short intro.
2. Weigh-in 1 appears: the anchor object sits on the left pan (Eiffel Tower) and the counterweight object is shown on the right (blue whale).
3. Pick how many counterweights you think it takes, then commit. There is no undo.
4. The objects drop onto the pan one by one, the scale swings and settles (see The weigh-in moment).
5. The reveal shows the real answer and a one-line fun fact.
6. Repeat for weigh-ins 2 to 5, each harder than the last.
7. See the day's total score, a summary of all 5 tilts, and the share card.
8. A countdown shows when tomorrow's set unlocks.

One shot means overshooting is on the player. The scale's tilt is the only judgment: no "correct" or "wrong" banner.

## The weigh-in moment

The answer is never shown as "correct" or "wrong" text. The player watches it happen: their chosen number of objects piles onto the pan, and the scale shows how close they were.

1. **Multiply.** After commit, the counterweight objects appear on the right pan and stack up to the number chosen. Small numbers drop one at a time; large numbers speed up and pile in groups so 2,000 ants still takes about 2 seconds.
2. **Swing.** The beam starts tipping as weight lands, then swings past the final position and back.
3. **Settle.** The needle wobbles and settles. Too many objects: the right pan sinks. Too few: the right pan lifts. Close: the beam rests near level.
4. **Reveal.** Only after the scale settles does a label show the real count ("It takes about 50") and a one-line fun fact. The tilt always comes first, so players feel how close they were before they see the number. That pause is the suspense. During it, the scale tips only according to the player's own guess; nothing marks where it would truly balance.

What this needs to get right:

- Big counts can't render thousands of objects. Show a pile that grows in size plus a counter, or bundle objects into crates ("x100").
- The wobble before the settle is where the suspense lives. Keep it short (about 1 second) so 5 rounds never drag.
- Sound is worth testing: a clunk per object and a creak as the beam swings.
- Reference for feel: Krillion's dive animation and Klifur's squishy movement.

## Input

The leading option is a brass dial, but nothing is decided until we see a mock-up of it next to a keyboard version.

| Option | How it works | Pros | Cons |
| --- | --- | --- | --- |
| Dial | Turn a dial that snaps to steps: 1, 2, 3, 5, 10, 20, 30, 50, 100 and so on | Fast on mobile; matches the scale look; pushes players to think in magnitudes | Less precise; needs a fine-tune control once you're in range |
| Keyboard | Type any number | Exact; familiar | Slower on phones; feels like a math quiz |
| Hybrid | Dial for the rough size, then +/- buttons to fine-tune | Feel of the dial with some precision | One more control to learn |

Next step: build a quick clickable mock-up of the dial and the hybrid before choosing.

## Scoring

Each weigh-in is scored by how far off the guess is as a ratio, not as a raw difference. Being 2 times off on 50 whales counts the same as being 2 times off on 5 million ants, so big-number rounds aren't unfair.

```latex
\text{error} = \left| \log_{10}\left(\frac{\text{guess}}{\text{answer}}\right) \right|
```

The tilt of the scale is the score made visible. A starting set of bands, to be tuned in playtesting:

| Off by | Tilt | Points |
| --- | --- | --- |
| Within 10% | Level | 100 |
| Within 1.5x | Slight lean | 75 |
| Within 3x | Clear lean | 50 |
| Within 10x | Heavy lean | 20 |
| More than 10x | Bottomed out | 0 |

- The day's total could be shown as "grains," like an old apothecary weight, rather than plain points. Name and unit are still open.
- All 5 weigh-ins are worth the same points, so players look forward to every round equally and don't skip the easier opening ones.
- The rule stays one shot. A tries-with-tilt-feedback version can be beaten by halving the range each time, so it's parked.

## Difficulty

Difficulty rises across the 5 weigh-ins each day: the first is a warm-up and the last is a mind-bender. The levels below are a starting guess; player feedback will set the final difficulty.

| Weigh-in | Size of the answer | Familiarity | Example |
| --- | --- | --- | --- |
| 1 | Under 10 | Everyday objects | A car vs. horses |
| 2 | Tens | Familiar | An elephant vs. adult humans |
| 3 | Hundreds | Familiar but big | A blue whale vs. elephants |
| 4 | Thousands or more | One unusual object | The Eiffel Tower vs. cars |
| 5 | Huge or surprising | A headline fact | All the ants on Earth vs. all humans |

Across the week, the whole set can get harder Monday to Sunday, the way some daily puzzles do. Examples here are placeholders until the database is built and checked. To calibrate, use both friend playtests before launch and real player data after launch, and compare which gives better results. In both, record each player's error on every weigh-in: a round most players miss by 10x or more is too hard for its slot, and one most players nail is too easy.

## Content and database

We build our own database of objects and their weights, so the game shows clean answers without a citation after every reveal. We still record where each number came from inside the database, so mistakes can be traced and fixed.

Each object record holds:

| Field | Example | Why |
| --- | --- | --- |
| Name | Blue whale | Shown to players |
| Weight (lb) | 330,000 | Used to compute answers |
| Certainty | Average adult; varies | Tells us how generous scoring should be |
| Category | Animal | Keeps pairs varied |
| Icon or art | whale.svg | Drawn on the pan |
| Fun fact | One surprising line, checked against the source | Shown in the reveal |
| Source (internal) | Link or note | For fixing errors, not shown |

Pairing rules:

- The answer comes from dividing the two weights, then rounding to a clean number.
- Both objects must be familiar enough to picture, even if the ratio surprises.
- Avoid objects whose weight varies wildly (a "tree"). Prefer specific, well-known ones (a school bus).
- Hand-pick every daily set from generated candidates, and keep a buffer of 30 or more days ready.

A first database of about 150 objects should give months of pairs.

## Visual world, share card and name (work in progress)

These three are open and will be explored separately before anything is locked.

**Visual world.** The game needs a world as strong as Krillion's ocean or Farflung's antique chart. Directions to explore:

- Victorian brass laboratory: engraved scale, warm metal, illustrated objects.
- Modern and minimal: flat shapes, bold colors, playful physics.
- Something else entirely, like a market stall or a cartoon carnival weigh station.

**Share card.** It should be fun to post and show how close you got without spoiling the answers. A first draft to build on:

```
Tipping Point #12 · 412 grains
🟢🟢🟡🟢🔴
```

Ideas to try: a tiny drawing of the five tilts instead of colored squares, or one line per weigh-in showing the lean.

**Name.** Still open. Front-runners are Tipping Point and Tip; backups are Counterweight, Heft and Grains. To check before committing: a long-running UK TV quiz show already uses the name, which could affect search results and trademark.

## Tech notes and first prototype

The first build in Claude Code should prove one thing: that a single weigh-in feels satisfying. Everything else waits.

Suggested stack:

- A static web page with plain JavaScript or a light framework, hosted free on a static host.
- The scale and objects drawn in SVG or canvas, animated with a small physics or tweening library.
- Objects stored in a JSON file to start; the daily set picked by date from a pre-shuffled list.
- Stats and streaks saved in the browser (localStorage) at first.

Prototype milestones:

- [ ] One hard-coded weigh-in: Eiffel Tower vs. blue whales
- [ ] Dial input and commit button
- [ ] Objects multiply onto the pan; the beam swings, wobbles and settles
- [ ] Reveal with the real answer and fun fact
- [ ] Scoring with the tilt bands
- [ ] Five weigh-ins in a row, then a results screen
- [ ] Playtest with 3 to 5 friends and watch where they hesitate

## Decisions so far

| Topic | Status | Current direction |
| --- | --- | --- |
| Core mechanic | Decided | Guess how many of one object balance another |
| Weigh-ins per day | Decided | 5, same set for everyone |
| Attempts | Decided | One shot per weigh-in; the tilt feedback comes right before how correct the answer was. (Suspense feeling) |
| Reveal | Decided | Objects multiply onto the pan and the scale tips; answer comes right after tilt. |
| Difficulty | Open | Gets harder from weigh-in 1 to 5 but want to see user feedback with set number of difficulty. |
| Content | Decided | Our own database; sources kept internally |
| Input | Open | Dial leading; decide after a mock-up |
| Scoring bands and weighting | Open | Equal points per weigh-in decided; tune the bands in playtests |
| Measurement types | Open | Weight only for now; height or time later? |
| Visual world | Open | Exploring options |
| Share card | Open | Draft above |
| Name | Open | Tipping point is a placeholder |
