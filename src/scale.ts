import type { Weighin } from "./weighin";

// Beam angle in degrees; positive = right end down.
const DEG_PER_DECADE = 12; // each 10x of imbalance tilts the beam this much
const MAX_ANGLE = 18;
const BEAM_HALF = 140;
const PIVOT = { x: 200, y: 110 };
const PILE_CAP = 30; // never draw more than this many sprites; the counter carries the rest
const PILE_COLS = 6;

// Underdamped spring: this is what makes the beam overshoot and wobble before it rests.
const STIFFNESS = 90;
const DAMPING = 7;
const HOLD_AFTER_LAST_DROP_MS = 600; // minimum suspense beat, even if the spring is already still

const SVG_NS = "http://www.w3.org/2000/svg";
const FALLBACK_ICON = "weight"; // plain brass weight for objects that have no art yet
const SPRITE = { w: 16, h: 12 }; // size of one counterweight in the pile

const iconHref = (icon?: string) => `#${icon ?? FALLBACK_ICON}`;

/** Beam angle when `count` counterweights sit on the right pan. Depends only on real weights. */
function angleFor(w: Weighin, count: number): number {
  if (count <= 0) return -MAX_ANGLE;
  const ratio = (count * w.counter.lb) / w.anchor.lb; // right weight / left weight
  const a = DEG_PER_DECADE * Math.log10(ratio);
  return Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, a));
}

export interface ScaleView {
  /** Set up a fresh weigh-in: anchor on the left pan, right pan empty and lifted. */
  load(w: Weighin): void;
  /** Multiply `count` objects onto the right pan; resolves once the beam has settled. */
  weigh(count: number, onCount: (n: number) => void): Promise<void>;
}

export function createScale(svg: SVGSVGElement, first: Weighin): ScaleView {
  const beam = svg.querySelector<SVGGElement>("#beam")!;
  const leftPan = svg.querySelector<SVGGElement>("#pan-left")!;
  const rightPan = svg.querySelector<SVGGElement>("#pan-right")!;
  const pile = svg.querySelector<SVGGElement>("#pile")!;
  const needle = svg.querySelector<SVGGElement>("#needle")!;
  const anchorArt = svg.querySelector<SVGUseElement>("#anchor-art")!;

  let w = first;
  let angle = 0;
  let velocity = 0;
  load(first);

  function load(next: Weighin) {
    w = next;
    pile.replaceChildren();
    anchorArt.setAttribute("href", iconHref(w.anchor.icon));
    svg.setAttribute("aria-label", `A balance scale with ${w.anchor.article} ${w.anchor.name} on the left pan`);
    angle = angleFor(w, 0);
    velocity = 0;
    render();
  }

  function render() {
    beam.setAttribute("transform", `rotate(${angle} ${PIVOT.x} ${PIVOT.y})`);
    needle.setAttribute("transform", `rotate(${angle * 2.2} ${PIVOT.x} ${PIVOT.y})`);
    const rad = (angle * Math.PI) / 180;
    const dx = BEAM_HALF * Math.cos(rad);
    const dy = BEAM_HALF * Math.sin(rad);
    // Pans hang from the beam ends and stay level, so they only translate.
    leftPan.setAttribute("transform", `translate(${PIVOT.x - dx} ${PIVOT.y - dy})`);
    rightPan.setAttribute("transform", `translate(${PIVOT.x + dx} ${PIVOT.y + dy})`);
  }

  function addSprite(index: number) {
    const col = index % PILE_COLS;
    const row = Math.floor(index / PILE_COLS);
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${-39 + col * 15.5} ${-16 - row * 13})`);
    const pop = document.createElementNS(SVG_NS, "g");
    pop.setAttribute("class", "pop");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", iconHref(w.counter.icon));
    use.setAttribute("width", String(SPRITE.w));
    use.setAttribute("height", String(SPRITE.h));
    pop.append(use);
    g.append(pop);
    pile.append(g);
  }

  function step(dt: number, target: number) {
    // Semi-implicit Euler in small substeps keeps the spring stable at any frame rate.
    const sub = Math.ceil(dt / (1 / 240));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      velocity += (STIFFNESS * (target - angle) - DAMPING * velocity) * h;
      angle += velocity * h;
    }
  }

  return {
    load,
    weigh(count, onCount) {
      pile.replaceChildren();
      onCount(0);
      // Singles drop about one at a time; big counts accelerate and cap at ~2s.
      const dropMs = Math.min(2000, 200 + count * 180);
      return new Promise((resolve) => {
        // Time is measured from the first frame's own timestamp. A frame timestamp can be
        // earlier than a performance.now() taken in the click handler, and a negative elapsed
        // time turns the easing below into NaN, which would stick in the spring for good.
        let start: number | null = null;
        let last = 0;
        let shown = 0;
        let calmSince: number | null = null;

        const frame = (now: number) => {
          if (start === null) start = last = now;
          const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
          last = now;
          const t = Math.max(0, Math.min(1, (now - start) / dropMs));
          const n = Math.round(count * Math.pow(t, 1.5));
          for (; shown < n; shown++) if (shown < PILE_CAP) addSprite(shown);
          onCount(n);

          const target = angleFor(w, n);
          step(dt, target);
          render();

          if (t >= 1) {
            const still = Math.abs(angle - target) < 0.12 && Math.abs(velocity) < 0.6;
            if (still) calmSince ??= now;
            else calmSince = null;
            const heldLongEnough = now - start - dropMs >= HOLD_AFTER_LAST_DROP_MS;
            if (heldLongEnough && calmSince !== null && now - calmSince > 120) {
              angle = target;
              velocity = 0;
              render();
              return resolve();
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    },
  };
}
