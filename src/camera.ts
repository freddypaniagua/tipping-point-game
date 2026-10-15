// The "camera" is just the SVG's viewBox: the welcome screen shows the wide dock scene, and
// pressing start glides in to the pirate and his scale. Because the scene and the scale share
// one coordinate system, moving the viewBox moves everything together. The stage fills the
// window and always shows the whole viewBox, so the views can be any shape.

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The pirate and his scale stand at the bottom of each view, which ends at the bottom of the
// market picture. The sky above them is where the title and the speech bubble (which holds the
// controls) float, so they never cover him or the scale.
export const WIDE: View = { x: -160, y: -230, w: 600, h: 680 }; // welcome: the market from further back
export const CLOSE: View = { x: -150, y: -110, w: 580, h: 560 }; // play: the pirate beside the barrel and scale

/** Left and right edges of the market picture (index.html). The camera never shows past them. */
export const SCENE = { left: -781.75, right: 959 };

/**
 * The view to use in a window of this shape (width / height). The stage always shows the whole
 * view, plus extra on the sides when the window is wider than the view. If that extra would run
 * past the picture, the view shrinks (keeping its bottom edge, so only sky is lost) until the
 * window's width fits, then slides sideways to stay inside. Exported for testing.
 */
export function fit(v: View, aspect: number): View {
  const sceneW = SCENE.right - SCENE.left;
  let { x, y, w, h } = v;
  const shown = Math.max(w, h * aspect); // how wide the window's view actually is
  if (shown > sceneW) {
    const k = sceneW / shown;
    const cx = x + w / 2;
    [w, h] = [w * k, h * k];
    [x, y] = [cx - w / 2, v.y + v.h - h];
  }
  const half = Math.max(w, h * aspect) / 2;
  const cx = Math.min(SCENE.right - half, Math.max(SCENE.left + half, x + w / 2));
  return { x: cx - w / 2, y, w, h };
}

let current: View = WIDE; // the last view asked for, so a resized window can be refitted

export function setView(svg: SVGSVGElement, v: View) {
  current = v;
  const aspect = svg.clientWidth / svg.clientHeight || 1;
  const f = fit(v, aspect);
  svg.setAttribute("viewBox", `${f.x} ${f.y} ${f.w} ${f.h}`);
}

/** The left and right edges of what the window actually shows, in scene units. */
export function shown(svg: SVGSVGElement): { left: number; right: number } {
  const { x, width, height } = svg.viewBox.baseVal;
  const half = Math.max(width, height * (svg.clientWidth / svg.clientHeight || 1)) / 2;
  return { left: x + width / 2 - half, right: x + width / 2 + half };
}

/** Refit the current view after the window changes shape. */
export const refit = (svg: SVGSVGElement) => setView(svg, current);

/** Position partway from `a` to `b`; `t` runs from 0 to 1. Exported for testing. */
export function between(a: View, b: View, t: number): View {
  const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease in, then out
  const mix = (from: number, to: number) => from + (to - from) * eased;
  return { x: mix(a.x, b.x), y: mix(a.y, b.y), w: mix(a.w, b.w), h: mix(a.h, b.h) };
}

/** Glide the camera from `from` to `to`. Resolves when it arrives. */
export function pan(svg: SVGSVGElement, from: View, to: View, ms = 1300): Promise<void> {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setView(svg, to);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let start: number | null = null;
    const frame = (now: number) => {
      start ??= now; // time from the first frame only (one clock, see INTERVIEW_NOTES)
      const t = Math.min(1, (now - start) / ms);
      setView(svg, between(from, to, t));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
