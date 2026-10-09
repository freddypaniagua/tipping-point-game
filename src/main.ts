import "./style.css";
import { createGuessInput } from "./input";
import { createScale } from "./scale";
import { score } from "./scoring";
import { EIFFEL_VS_WHALES as weighin, displayAnswer } from "./weighin";

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;

const controls = $<HTMLFormElement>("#controls");
const commit = $<HTMLButtonElement>("#commit");
const readout = $<HTMLElement>("#count-readout");
const reveal = $<HTMLElement>("#reveal");
const reset = $<HTMLButtonElement>("#reset");

$("#counter-name").textContent = weighin.counter.plural;
$("#anchor-name").textContent = weighin.anchor.name;

const input = createGuessInput(controls);
const scale = createScale($<SVGSVGElement>("#scale"), weighin);

let committed = false;

controls.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (committed) return; // one shot, no undo
  committed = true;
  input.setEnabled(false);
  commit.disabled = true;

  const guess = input.value();
  await scale.weigh(guess, (n) => {
    readout.textContent = n === 0 ? " " : `× ${n.toLocaleString()} ${n === 1 ? weighin.counter.name : weighin.counter.plural}`;
  });

  // Only now, after the beam has settled, do we reveal the real count.
  // Score against the number we display, so players can check the math themselves.
  const answer = displayAnswer(weighin);
  const result = score(guess, answer);
  $("#answer").textContent = answer.toLocaleString();
  $("#result").textContent = `You said ${guess.toLocaleString()} · ${result.label} · ${result.points} points`;
  $("#fact").textContent = weighin.funFact;
  reveal.hidden = false;
});

// Dev convenience so the animation can be replayed while tuning. Not part of the game
// (the real game is one shot per weigh-in), and stripped from production builds.
if (import.meta.env.DEV) {
  reset.hidden = false;
  reset.addEventListener("click", () => location.reload());
}
