import { HEAP_CAP, heapSlot } from "./heap";
import type { Weighin } from "./weighin";

// Beam angle in degrees; positive = right end down.
const DEG_PER_DECADE = 12; // each 10x of imbalance tilts the beam this much
const MAX_ANGLE = 18;
const BEAM_HALF = 121; // pivot to ring: 33 art pixels of the beam sprite (index.html)
const PIVOT = { x: 200, y: 110 };

// Underdamped spring: this is what makes the beam overshoot and wobble before it rests.
const STIFFNESS = 90;
const DAMPING = 7;
const HOLD_AFTER_LAST_DROP_MS = 600; // minimum suspense beat, even if the spring is already still
const LAND_MS = 216; // a dropped object hits the pan 60% into its 0.36s fall (style.css, .drop)

const SVG_NS = "http://www.w3.org/2000/svg";
// Sizes in the scale's own units, where one art pixel is 11/3 (index.html). Objects stand on the
// floor of the pan's dish (the pile's origin), just behind its front lip.
const PX = 11 / 3;
const COUNTER = { w: 8 * PX, h: 9 * PX }; // box one counterweight is fitted into
const SLOT = { across: 6.5 * PX, up: 6 * PX }; // neighbours in the heap overlap a little, so they rest on each other
const ANCHOR = { w: 28 * PX, h: 28 * PX }; // box the anchor object is fitted into, about the dish's width

// Every sprite in assets/art/objects, keyed by file name. Vite turns each into a hashed URL.
const SPRITES = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("./assets/art/objects/*.png", { eager: true, query: "?url", import: "default" }),
  ).map(([path, url]) => [path.split("/").pop()!.replace(".png", ""), url]),
);

/** Draw an object inside a box, standing on the box's bottom edge. No sprite yet: a plain brass weight. */
function objectArt(icon: string | undefined, width: number, height: number): SVGElement {
  const url = icon ? SPRITES[icon] : undefined;
  const art = document.createElementNS(SVG_NS, url ? "image" : "use");
  art.setAttribute("href", url ?? "#weight");
  art.setAttribute("width", String(width));
  art.setAttribute("height", String(height));
  if (url) art.setAttribute("preserveAspectRatio", "xMidYMax meet");
  return art;
}

/** Wrap art so it drops into the pan as it appears: it falls, squashes on landing and settles (style.css). */
function falling(art: SVGElement): SVGGElement {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", "drop");
  g.append(art);
  return g;
}

/** Beam angle when `count` counterweights sit on the right pan. Depends only on real weights. */
function angleFor(w: Weighin, count: number): number {
  if (count <= 0) return -MAX_ANGLE;
  const ratio = (count * w.counter.lb) / w.anchor.lb; // right weight / left weight
  const a = DEG_PER_DECADE * Math.log10(ratio);
  return Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, a));
}

export interface ScaleView {
  /**
   * Set up a fresh weigh-in: empty the right pan and drop the anchor onto the left one. When it
   * lands, the beam swings down to the left and settles.
   */
  load(w: Weighin): void;
  /** Multiply `count` objects onto the right pan; resolves once the beam has settled. */
  weigh(count: number, onCount: (n: number) => void): Promise<void>;
}

/** The scale starts empty and level, until the first weigh-in is loaded. */
export function createScale(svg: SVGSVGElement): ScaleView {
  const beam = svg.querySelector<SVGGElement>("#beam")!;
  const leftPan = svg.querySelector<SVGGElement>("#pan-left")!;
  const rightPan = svg.querySelector<SVGGElement>("#pan-right")!;
  const pile = svg.querySelector<SVGGElement>("#pile")!;
  const anchorArt = svg.querySelector<SVGGElement>("#anchor-art")!;

  let w: Weighin;
  let angle = 0;
  let velocity = 0;
  let motion = 0; // bumped by every animation, so a newer one stops an older one's frames
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  render();

  function load(next: Weighin) {
    w = next;
    pile.replaceChildren();
    anchorArt.replaceChildren(falling(objectArt(w.anchor.icon, ANCHOR.w, ANCHOR.h)));
    svg.setAttribute("aria-label", `A balance scale with ${w.anchor.article} ${w.anchor.name} on the left pan`);
    const target = angleFor(w, 0);
    if (reducedMotion) {
      angle = target;
      velocity = 0;
      return render();
    }
    // The beam only moves once the anchor hits the pan, then swings and wobbles like any weighing.
    const mine = ++motion;
    let last: number | null = null;
    const frame = (now: number) => {
      if (mine !== motion) return;
      last ??= now;
      step(Math.max(0, Math.min(0.05, (now - last) / 1000)), target);
      last = now;
      render();
      if (Math.abs(angle - target) > 0.05 || Math.abs(velocity) > 0.1) requestAnimationFrame(frame);
    };
    setTimeout(() => mine === motion && requestAnimationFrame(frame), LAND_MS);
  }

  function render() {
    beam.setAttribute("transform", `rotate(${angle} ${PIVOT.x} ${PIVOT.y})`);
    const rad = (angle * Math.PI) / 180;
    const dx = BEAM_HALF * Math.cos(rad);
    const dy = BEAM_HALF * Math.sin(rad);
    // Pans hang from the beam ends and stay level, so they only translate.
    leftPan.setAttribute("transform", `translate(${PIVOT.x - dx} ${PIVOT.y - dy})`);
    rightPan.setAttribute("transform", `translate(${PIVOT.x + dx} ${PIVOT.y + dy})`);
  }

  function addSprite(index: number) {
    const slot = heapSlot(index);
    if (!slot) return; // the heap is full; the counter carries the rest
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${slot.across * SLOT.across - COUNTER.w / 2} ${-slot.row * SLOT.up - COUNTER.h})`);
    g.append(falling(objectArt(w.counter.icon, COUNTER.w, COUNTER.h)));
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
      const mine = ++motion; // takes over from the anchor's landing if it is still swinging
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
        let shown = 0; // counterweights counted so far (only the first HEAP_CAP are drawn)
        let calmSince: number | null = null;
        // The pan only feels each object's weight when it lands, LAND_MS after it appears.
        const appeared: { at: number; n: number }[] = [];
        let landed = 0;

        const frame = (now: number) => {
          if (mine !== motion) return;
          if (start === null) start = last = now;
          const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
          last = now;
          const t = Math.max(0, Math.min(1, (now - start) / dropMs));
          const n = Math.round(count * Math.pow(t, 1.5));
          if (n > shown) appeared.push({ at: now, n });
          // Only draw up to the top of the heap. Walking every one would freeze the page on a
          // guess in the millions: the loop would run that many times within a few frames.
          for (let i = shown; i < Math.min(n, HEAP_CAP); i++) addSprite(i);
          shown = Math.max(shown, n);
          onCount(n);
          while (appeared.length && now - appeared[0].at >= LAND_MS) landed = appeared.shift()!.n;

          const target = angleFor(w, landed);
          step(dt, target);
          render();

          if (t >= 1 && landed === count) {
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
