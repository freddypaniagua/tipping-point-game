// The pirate who runs the weigh station. He only asks the questions: his mouth moves while the
// question types into the speech bubble. No sound, no hints, and he never reacts to the guess,
// so nothing gives away the balance point (see CLAUDE.md, locked decisions).
//
// He is one still sprite. Breathing is a CSS squash (style.css); talking and blinking are
// small patches drawn over his mouth and eyes, measured in the sprite's own pixels.

import spriteUrl from "./assets/art/pirate.png";

const SPRITE = { w: 87, h: 123 }; // the sprite's size in art pixels
/** One art pixel in scene units, shared by every sprite in the scene (see index.html). */
const PIXEL = 2.75;
/** Patch positions below are in sprite pixels: re-measure them when the art changes. */
const MOUTH = { x: 43, y: 41, w: 6, h: 1 }; // the gap between his lips
const EYES = [{ x: 39, y: 30, w: 4, h: 2 }]; // the other one is under the eyepatch
const SKIN = "#fead80";
const DARK = "#2a1512";

const SVG_NS = "http://www.w3.org/2000/svg";

function node(tag: string, attrs: Record<string, string | number>): SVGElement {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

export interface Pirate {
  /** Type `text` into the speech bubble while the mouth moves. Resolves when he has finished. */
  say(text: string): Promise<void>;
}

const CHAR_MS = 28; // typing speed
const FLAP_EVERY = 3; // the mouth changes every few characters
const BLINK_MS = 140;

/**
 * @param group  an empty SVG <g> placed where his box's top-left corner goes
 * @param bubble the element that shows what he says
 */
export function createPirate(group: SVGGElement, bubble: HTMLElement): Pirate {
  const openMouth = node("rect", { ...rectAttrs(MOUTH), fill: DARK, visibility: "hidden" });
  const eyelid = node("g", { visibility: "hidden" });
  for (const eye of EYES) {
    // Skin over the eye, with its bottom row left dark as the closed lid.
    eyelid.append(
      node("rect", { ...rectAttrs(eye), fill: SKIN }),
      node("rect", { x: eye.x, y: eye.y + eye.h - 1, width: eye.w, height: 1, fill: DARK }),
    );
  }
  // Two groups: the outer one scales sprite pixels up to scene units, the inner one breathes.
  // (A CSS animation replaces an element's transform, so they can't share an element.)
  const fit = node("g", { transform: `scale(${PIXEL})` });
  const body = node("g", { class: "breathe", "shape-rendering": "crispEdges" });
  body.append(node("image", { href: spriteUrl, width: SPRITE.w, height: SPRITE.h }), openMouth, eyelid);
  fit.append(body);
  group.append(fit);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) blinkNowAndThen(eyelid);
  let speech = 0; // bumped on every say(), so an older line stops typing when a new one starts

  return {
    say(text) {
      const mine = ++speech;
      bubble.setAttribute("aria-label", text); // screen readers get the whole line, not the typing
      if (reducedMotion) {
        bubble.textContent = text;
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        let shown = 0;
        const step = () => {
          if (mine !== speech) return resolve();
          shown++;
          bubble.textContent = text.slice(0, shown);
          const talking = shown < text.length;
          const open = talking && Math.floor(shown / FLAP_EVERY) % 2 === 0;
          openMouth.setAttribute("visibility", open ? "visible" : "hidden");
          if (talking) setTimeout(step, CHAR_MS);
          else resolve();
        };
        step();
      });
    },
  };
}

function rectAttrs(r: { x: number; y: number; w: number; h: number }) {
  return { x: r.x, y: r.y, width: r.w, height: r.h };
}

/** Close the eye briefly every few seconds, at uneven intervals so it doesn't look mechanical. */
function blinkNowAndThen(eyelid: SVGElement) {
  const blink = () => {
    eyelid.setAttribute("visibility", "visible");
    setTimeout(() => eyelid.setAttribute("visibility", "hidden"), BLINK_MS);
    setTimeout(blink, 2500 + Math.random() * 3500);
  };
  setTimeout(blink, 2000);
}
