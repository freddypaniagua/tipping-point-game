import "./style.css";
import { createGuessInput } from "./input";
import { createScale } from "./scale";
import { score } from "./scoring";
import { WEIGHINS, displayAnswer } from "./weighin";

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;

const controls = $<HTMLFormElement>("#controls");
const commit = $<HTMLButtonElement>("#commit");
const readout = $<HTMLElement>("#count-readout");
const reveal = $<HTMLElement>("#reveal");
const next = $<HTMLButtonElement>("#next");
const reset = $<HTMLButtonElement>("#reset");

const input = createGuessInput(controls);
const scale = createScale($<SVGSVGElement>("#scale"), WEIGHINS[0]);

let index = 0; // which of today's weigh-ins is on the scale
let committed = false;

/** Put weigh-in `i` on the scale and hand the controls back to the player. */
function show(i: number) {
  index = i;
  committed = false;
  const { anchor, counter } = WEIGHINS[i];

  $("#progress").textContent = `Weigh-in ${i + 1} of ${WEIGHINS.length}`;
  $("#counter-name").textContent = counter.plural;
  $("#anchor-name").textContent = `${anchor.article} ${anchor.name}`;
  readout.textContent = " "; // non-breaking space keeps the line's height while empty
  reveal.hidden = true;
  next.hidden = true;

  scale.load(WEIGHINS[i]);
  input.reset();
  input.setEnabled(true);
  commit.disabled = false;
}

controls.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (committed) return; // one shot, no undo
  committed = true;
  input.setEnabled(false);
  commit.disabled = true;

  const weighin = WEIGHINS[index];
  const guess = input.value();
  await scale.weigh(guess, (n) => {
    const noun = n === 1 ? weighin.counter.name : weighin.counter.plural;
    readout.textContent = n === 0 ? " " : `× ${n.toLocaleString()} ${noun}`;
  });

  // Only now, after the beam has settled, do we reveal the real count.
  // Score against the number we display, so players can check the math themselves.
  const answer = displayAnswer(weighin);
  const result = score(guess, answer);
  $("#answer").textContent = answer.toLocaleString();
  $("#result").textContent = `You said ${guess.toLocaleString()} · ${result.label} · ${result.points} points`;
  $("#fact").textContent = weighin.funFact;
  next.hidden = index + 1 >= WEIGHINS.length; // the results screen will take over after the last one
  reveal.hidden = false;
});

next.addEventListener("click", () => show(index + 1));

show(0);

// Dev convenience so the animation can be replayed while tuning. Not part of the game
// (the real game is one shot per weigh-in), and stripped from production builds.
if (import.meta.env.DEV) {
  reset.hidden = false;
  reset.addEventListener("click", () => location.reload());
}
