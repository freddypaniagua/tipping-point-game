// The pirate who runs the weigh station. He only asks the questions: his mouth moves while the
// question types into the speech bubble. No sound, no hints, and he never reacts to the guess,
// so nothing gives away the balance point (see CLAUDE.md, locked decisions).
//
// He is one still sprite, animated like a paper puppet: his hands and boots are cut out of it
// and moved on their own (rig.ts), so he swings his arms and steps as he walks, sways his
// cutlass while he waits and gestures while he talks. Breathing is a CSS squash (style.css);
// talking and blinking are small patches drawn over his mouth and eyes. Everything is measured
// in the sprite's own pixels and moves in whole pixels, so he stays on the scene's pixel grid.

import spriteUrl from "./assets/art/pirate.png";
import { cutOut, rotate, upscale, type Box, type Pixels, type Point } from "./rig";

const SPRITE = { w: 87, h: 123 }; // the sprite's size in art pixels
/** One art pixel in scene units, shared by every sprite in the scene (see index.html). */
const PIXEL = 2.75;
/** Patch positions below are in sprite pixels: re-measure them when the art changes. */
const MOUTH = { x: 43, y: 41, w: 6, h: 1 }; // the gap between his lips
const EYES = [{ x: 39, y: 30, w: 4, h: 2 }]; // the other one is under the eyepatch
/** The cut-out parts. Each turns about its pivot; `pad` is the room it needs to turn into. */
const SWORD = { box: { x: 0, y: 22, w: 24, h: 68 }, pivot: { x: 23, y: 72 }, pad: 14 }; // hand and cutlass, at the wrist
// The free hand turns at the cuff. Its box overlaps the hem of his coat, so blue stays behind.
const HAND = { box: { x: 70, y: 71, w: 17, h: 23 }, pivot: { x: 72, y: 72 }, pad: 8, leave: isCoat };
const BOOTS: Box[] = [
  { x: 25, y: 101, w: 27, h: 22 }, // the boot on the left of the picture
  { x: 52, y: 101, w: 26, h: 22 },
];
/** Coat blue: clearly more blue than red or green. (Pixels are packed RGBA, red in the low byte.) */
function isCoat(rgba: number) {
  const r = rgba & 0xff, g = (rgba >> 8) & 0xff, b = (rgba >> 16) & 0xff;
  return b > r + 40 && b > g + 20;
}
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
  /** Walk in from just past the right edge of the window to his spot. Resolves when he arrives. */
  walkIn(): Promise<void>;
  /** Crouch, jump and land on his spot (cutting short a walk still under way). */
  hop(): Promise<void>;
}

const CHAR_MS = 28; // typing speed
const FLAP_EVERY = 3; // the mouth changes every few characters
const BLINK_MS = 140;

// Motion, in sprite pixels and milliseconds.
const WALK_SPEED = 150; // px per second
const MAX_WALK_MS = 2600; // on very wide windows he walks faster rather than for longer
const STEP_MS = 190; // one footfall
const STEP_HEIGHT = 2; // bob per step
const STEP_LIFT = 2; // how high a boot comes off the dock
const HOP_MS = 520;
const HOP_HEIGHT = 9;
// Arm angles in degrees, clockwise. Negative turns both hands outward, away from his body.
const ARM_SWING = 8; // while walking
const SWORD_SWAY = 2; // while standing
const GESTURE = -22; // the free hand while talking
const FLARE = -14; // both arms during a hop

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
  // Inside, back to front: boots, the body, mouth and eye patches, then the hands.
  const fit = node("g", { transform: `scale(${PIXEL})` }) as SVGGElement;
  const pose = node("g", {});
  const body = node("g", { class: "breathe", "shape-rendering": "crispEdges" });
  const behind = node("g", {});
  const still = node("image", { href: spriteUrl, width: SPRITE.w, height: SPRITE.h });
  const inFront = node("g", {});
  body.append(behind, still, openMouth, eyelid, inFront);
  pose.append(body);
  fit.append(pose);
  group.append(fit);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) blinkNowAndThen(eyelid);
  let speech = 0; // bumped on every say(), so an older line stops typing when a new one starts

  // Where he is relative to his spot. Walks and hops set `x`, `y`, `squash`, `stride` and
  // `flare`; talking sets `lift` and `talking`. The loop below turns these into a drawing.
  const at = { x: 0, y: 0, squash: 1, lift: 0, walking: false, stride: 0, flare: 0, talking: false };
  let gesture = 0; // eases from 0 to 1 when he starts talking, so the hand rises rather than jumps

  // Until the cut-out parts are ready (a few ms after load), he is drawn as the plain sprite.
  let rig: Rig | null = null;
  const ready = buildRig(still, behind, inFront).then((r) => (rig = r));

  const draw = (now: number) => {
    // Round to whole pixels so the sprite never lands between grid lines and blurs.
    let t = `translate(${Math.round(at.x)} ${Math.round(at.y) - at.lift})`;
    if (at.squash !== 1) {
      // Squash about his feet: shorter and wider by the same amount, so he keeps his volume.
      const [cx, cy] = [SPRITE.w / 2, SPRITE.h];
      t += ` translate(${cx} ${cy}) scale(${2 - at.squash} ${at.squash}) translate(${-cx} ${-cy})`;
    }
    pose.setAttribute("transform", t);
    if (!rig) return;

    // Each stride is one footstep; the boots take turns, each rising and moving a pixel forward
    // (to the left, the way he faces).
    const step = Math.floor(at.stride), into = at.stride - step;
    const lift = at.walking ? Math.round(STEP_LIFT * Math.sin(into * Math.PI)) : 0;
    rig.boots.forEach((boot, i) => {
      const moving = lift > 0 && step % 2 === i;
      boot.setAttribute("transform", moving ? `translate(-1 ${-lift})` : "");
    });
    // Arms swing against the legs, like anyone walking.
    const swing = at.walking ? ARM_SWING * Math.sin(at.stride * Math.PI) : 0;
    const sway = SWORD_SWAY * Math.sin(now / 700);
    rig.sword.turn(sway + swing + FLARE * at.flare);
    const wave = gesture * (GESTURE + 4 * Math.sin(now / 110)); // a little waggle as he talks
    rig.hand.turn(wave - swing + FLARE * at.flare);
  };

  if (reducedMotion) void ready.then(() => draw(0));
  else {
    let last: number | null = null;
    const live = (now: number) => {
      const dt = Math.min(100, now - (last ?? now));
      last = now;
      gesture += ((at.talking ? 1 : 0) - gesture) * (1 - Math.exp(-dt / 120));
      draw(now);
      requestAnimationFrame(live);
    };
    requestAnimationFrame(live);
  }

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
      at.talking = text.length > 0;
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
          if (talking) setTimeout(step, CHAR_MS);
          else {
            at.talking = false;
            resolve();
          }
        };
        step();
      });
    },

    async walkIn() {
      if (reducedMotion) return;
      await ready; // so he arrives with his arms and legs already moving
      // He faces left, so he comes in from the right (passing behind the barrel), starting with
      // his left edge just past the window's right edge. `fit` maps sprite pixels to the screen,
      // so its matrix says where pixel 0 is (e) and how big one pixel is (a).
      const ctm = fit.getScreenCTM();
      const from = ctm ? Math.max(SPRITE.w, (window.innerWidth - ctm.e) / ctm.a + 2) : SPRITE.w * 2;
      const ms = Math.min(MAX_WALK_MS, (from / WALK_SPEED) * 1000);
      const steps = Math.max(2, Math.round(ms / STEP_MS)); // whole steps, so he ends on the ground
      at.walking = true;
      await tween(ms, (t) => {
        at.x = from * (1 - Math.sin((t * Math.PI) / 2)); // slows down as he reaches his spot
        at.stride = t * steps;
        at.y = -STEP_HEIGHT * Math.abs(Math.sin(at.stride * Math.PI));
      });
      at.walking = false;
    },

    hop() {
      if (reducedMotion) return Promise.resolve();
      at.x = 0; // a walk cut short ends on his spot
      at.walking = false;
      return tween(HOP_MS, (t) => {
        at.flare = Math.sin(t * Math.PI); // arms out on the way up, back down as he lands
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

interface Limb {
  /** Show the part turned this many degrees clockwise about its pivot. */
  turn(degrees: number): void;
}

interface Rig {
  sword: Limb;
  hand: Limb;
  boots: SVGElement[];
}

/** Cut the hands and boots out of the sprite and put each in its own image. */
async function buildRig(still: SVGElement, behind: SVGElement, inFront: SVGElement): Promise<Rig> {
  const img = new Image();
  img.src = spriteUrl;
  await img.decode();
  const ctx = canvas(SPRITE.w, SPRITE.h);
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, SPRITE.w, SPRITE.h).data;
  const sprite: Pixels = { w: SPRITE.w, h: SPRITE.h, data: new Uint32Array(pixels.buffer) };

  const limb = ({ box, pivot, pad, leave }: { box: Box; pivot: Point; pad: number; leave?: (rgba: number) => boolean }): Limb => {
    const big = upscale(cutOut(sprite, box, pad, leave));
    const local = { x: pivot.x - box.x + pad, y: pivot.y - box.y + pad };
    const el = node("image", { x: box.x - pad, y: box.y - pad, width: box.w + 2 * pad, height: box.h + 2 * pad });
    inFront.append(el);
    const frames = new Map<number, string>(); // one image per whole degree, made when first needed
    let shown: number | null = null;
    return {
      turn(degrees) {
        const d = Math.round(degrees);
        if (d === shown) return;
        shown = d;
        if (!frames.has(d)) frames.set(d, toUrl(rotate(big, d, local)));
        el.setAttribute("href", frames.get(d)!);
      },
    };
  };
  const boots = BOOTS.map((box) => {
    const el = node("image", { href: toUrl(cutOut(sprite, box, 0)), x: box.x, y: box.y, width: box.w, height: box.h });
    behind.append(el);
    return el;
  });
  const rig = { hand: limb(HAND), sword: limb(SWORD), boots };
  rig.hand.turn(0);
  rig.sword.turn(0);
  still.setAttribute("href", toUrl(sprite)); // what's left once the parts are cut out
  return rig;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c.getContext("2d", { willReadFrequently: true })!;
}

function toUrl(p: Pixels): string {
  const ctx = canvas(p.w, p.h);
  const img = ctx.createImageData(p.w, p.h);
  img.data.set(new Uint8Array(p.data.buffer, p.data.byteOffset, p.data.byteLength));
  ctx.putImageData(img, 0, 0);
  return ctx.canvas.toDataURL();
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
