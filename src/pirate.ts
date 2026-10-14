// The pirate who runs the weigh station. He only asks the questions: his mouth moves while the
// question types into the speech bubble. No sound, no hints, and he never reacts to the guess,
// so nothing gives away the balance point (see CLAUDE.md, locked decisions).
//
// He is one still sprite. Breathing is a CSS squash (style.css); talking and blinking are
// small patches drawn over his mouth and eyes, measured in the sprite's own pixels. Walking,
// hopping and the bounce while he talks move the whole sprite, in whole art pixels so he
// stays on the same pixel grid as the rest of the scene.

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
  /** Walk in from just past the left edge of the window to his spot. Resolves when he arrives. */
  walkIn(): Promise<void>;
  /** Crouch, jump and land on his spot (cutting short a walk still under way). */
  hop(): Promise<void>;
}

const CHAR_MS = 28; // typing speed
const FLAP_EVERY = 3; // the mouth changes every few characters
const BLINK_MS = 140;

// Motion, in sprite pixels and milliseconds.
const WALK_SPEED = 150; // px per second
const MAX_WALK = 260; // on very wide windows he starts nearer than the edge
const STEP_MS = 190; // one footfall
const STEP_HEIGHT = 2; // bob per step
const HOP_MS = 520;
const HOP_HEIGHT = 9;

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
  // Three groups: the outer one scales sprite pixels up to scene units, the middle one walks and
  // hops (set from JS), the inner one breathes. (A CSS animation replaces an element's
  // transform, so the breathing can't share an element with anything else.)
  const fit = node("g", { transform: `scale(${PIXEL})` }) as SVGGElement;
  const pose = node("g", {});
  const body = node("g", { class: "breathe", "shape-rendering": "crispEdges" });
  body.append(node("image", { href: spriteUrl, width: SPRITE.w, height: SPRITE.h }), openMouth, eyelid);
  pose.append(body);
  fit.append(pose);
  group.append(fit);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) blinkNowAndThen(eyelid);
  let speech = 0; // bumped on every say(), so an older line stops typing when a new one starts

  // Where he is relative to his spot. Walks and hops set `x`, `y` and `squash`; talking sets `lift`.
  const at = { x: 0, y: 0, squash: 1, lift: 0 };
  const draw = () => {
    // Round to whole pixels so the sprite never lands between grid lines and blurs.
    let t = `translate(${Math.round(at.x)} ${Math.round(at.y) - at.lift})`;
    if (at.squash !== 1) {
      // Squash about his feet: shorter and wider by the same amount, so he keeps his volume.
      const [cx, cy] = [SPRITE.w / 2, SPRITE.h];
      t += ` translate(${cx} ${cy}) scale(${2 - at.squash} ${at.squash}) translate(${-cx} ${-cy})`;
    }
    pose.setAttribute("transform", t);
  };

  let motion = 0; // bumped by every walk or hop, so a newer one takes over from an older one
  const tween = (ms: number, frame: (t: number) => void) => {
    const mine = ++motion;
    return new Promise<void>((resolve) => {
      let start: number | null = null;
      const tick = (now: number) => {
        if (mine !== motion) return resolve();
        start ??= now; // time from the first frame only (one clock, see INTERVIEW_NOTES)
        const t = Math.min(1, (now - start) / ms);
        frame(t);
        draw();
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  };

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
          at.lift = open ? 1 : 0; // a one-pixel bounce on each open mouth
          draw();
          if (talking) setTimeout(step, CHAR_MS);
          else resolve();
        };
        step();
      });
    },

    walkIn() {
      if (reducedMotion) return Promise.resolve();
      // Start with his right edge just past the window's left edge. `fit` maps sprite pixels to
      // the screen, so its matrix says where pixel 0 is (e) and how big one pixel is (a).
      const ctm = fit.getScreenCTM();
      const offscreen = ctm ? -ctm.e / ctm.a - SPRITE.w - 2 : -SPRITE.w;
      const from = Math.max(-MAX_WALK, Math.min(-SPRITE.w, offscreen));
      const ms = (-from / WALK_SPEED) * 1000;
      const steps = Math.max(2, Math.round(ms / STEP_MS)); // whole steps, so he ends on the ground
      return tween(ms, (t) => {
        at.x = from * (1 - Math.sin((t * Math.PI) / 2)); // slows down as he reaches his spot
        at.y = -STEP_HEIGHT * Math.abs(Math.sin(t * steps * Math.PI));
      });
    },

    hop() {
      if (reducedMotion) return Promise.resolve();
      at.x = 0; // a walk cut short ends on his spot
      return tween(HOP_MS, (t) => {
        // Crouch for the first 15%, fly until 80%, then squash on landing and spring back.
        if (t < 0.15) {
          at.y = 0;
          at.squash = 1 - 0.08 * Math.sin(((t / 0.15) * Math.PI) / 2);
        } else if (t < 0.8) {
          const u = (t - 0.15) / 0.65;
          at.y = -HOP_HEIGHT * 4 * u * (1 - u); // a parabola: up, then back down
          at.squash = 1 - 0.08 * Math.max(0, 1 - u * 4); // stretch back out as he leaves the ground
        } else {
          at.y = 0;
          at.squash = 1 - 0.06 * Math.sin(((t - 0.8) / 0.2) * Math.PI);
        }
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
