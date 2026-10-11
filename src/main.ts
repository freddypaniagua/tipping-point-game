import "./style.css";
import { createGuessInput } from "./input";
import { MAX_POINTS_PER_ROUND, rating, recordRound, shareText, tiltDegrees, totalPoints, type RoundResult } from "./results";
import { createScale } from "./scale";
import { WEIGHINS } from "./weighin";

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
const rounds: RoundResult[] = []; // one entry per finished weigh-in, in play order

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
  const round = recordRound(weighin, guess);
  rounds.push(round);
  $("#answer").textContent = round.answer.toLocaleString();
  $("#result").textContent = `You said ${guess.toLocaleString()} · ${round.band.label} · ${round.band.points} points`;
  $("#fact").textContent = weighin.funFact;
  next.textContent = isLast() ? "See your results" : "Next weigh-in";
  next.hidden = false;
  reveal.hidden = false;
});

const isLast = () => index + 1 >= WEIGHINS.length;
next.addEventListener("click", () => (isLast() ? showResults() : show(index + 1)));

const SVG_NS = "http://www.w3.org/2000/svg";

/** A tiny beam on a pivot, leaning the way the real scale settled for that round. */
function tiltIcon(degrees: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 40 28");
  svg.setAttribute("class", "tilt");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML =
    `<path d="M20 14 L14 26 H26 Z" fill="#8c6a2f" />` +
    `<g transform="rotate(${degrees.toFixed(1)} 20 14)">` +
    `<path d="M4 14 H36" stroke="#c79a3b" stroke-width="4" stroke-linecap="round" />` +
    `<circle cx="5" cy="14" r="3.5" fill="#8c6a2f" /><circle cx="35" cy="14" r="3.5" fill="#8c6a2f" /></g>`;
  return svg;
}

const el = (tag: string, className: string, text: string) => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};

/** Swap the scale for the end-of-day summary. */
function showResults() {
  $<HTMLElement>("#play").hidden = true;
  $("#progress").textContent = "Today's results";
  $("h1").textContent = "Your weigh-ins";
  $("#total").textContent = String(totalPoints(rounds));
  $("#total-max").textContent = `of ${rounds.length * MAX_POINTS_PER_ROUND}`;
  $("#rating").textContent = rating(rounds);

  $("#rounds").replaceChildren(
    ...rounds.map((r) => {
      const { anchor, counter } = r.weighin;
      const title = `${anchor.name[0].toUpperCase()}${anchor.name.slice(1)} vs ${counter.plural}`;
      const detail = `You said ${r.guess.toLocaleString()} · It takes about ${r.answer.toLocaleString()}`;
      const text = el("div", "round-text", "");
      text.append(el("p", "round-title", title), el("p", "round-detail", detail));
      const li = el("li", "round", "");
      li.append(tiltIcon(tiltDegrees(r)), text, el("span", "round-points", String(r.band.points)));
      return li;
    }),
  );

  $("#share-text").textContent = shareText(rounds);
  $<HTMLElement>("#results").hidden = false;

}

const share = $<HTMLButtonElement>("#share");
share.addEventListener("click", async () => {
  // Clipboard access can be refused (older browsers, non-HTTPS); the text is on screen either way.
  try {
    await navigator.clipboard.writeText(shareText(rounds));
    share.textContent = "Copied";
  } catch {
    share.textContent = "Copy the text below";
  }
});

show(0);

// Dev convenience so the animation can be replayed while tuning. Not part of the game
// (the real game is one shot per weigh-in), and stripped from production builds.
if (import.meta.env.DEV) {
  reset.hidden = false;
  reset.addEventListener("click", () => location.reload());
}
