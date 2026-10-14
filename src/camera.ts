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

// Each view includes empty sky above the pirate and dock below the barrel: that is where the
// title, speech bubble and controls float, so they never cover him or the scale.
export const WIDE: View = { x: -160, y: -520, w: 600, h: 1100 }; // welcome: the dock from further back
export const CLOSE: View = { x: -150, y: -190, w: 580, h: 670 }; // play: the pirate beside the barrel and scale

export function setView(svg: SVGSVGElement, v: View) {
  svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
}

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
