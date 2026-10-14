// Cut-out animation for a single pixel-art sprite. Limbs are cut out of the still sprite and
// moved on their own, like a paper puppet, so the pirate can swing his arms and step without
// anyone drawing extra frames.
//
// Rotating pixel art normally smears it. Instead we use the idea behind RotSprite: upscale the
// part 8x with Scale2x (which rounds off diagonals instead of making big blocks), rotate that,
// then sample it back down at the original size. The result stays on the same pixel grid with
// clean outlines.

/** An image as one packed RGBA value per pixel, row by row. */
export interface Pixels {
  w: number;
  h: number;
  data: Uint32Array;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export const blank = (w: number, h: number): Pixels => ({ w, h, data: new Uint32Array(w * h) });

/**
 * Move the pixels inside `box` out of `src` (leaving them transparent there) into a new image
 * with `pad` empty pixels on every side, so the part has room to rotate. Pixels for which
 * `leave` is true stay behind, for when a box can't avoid catching a bit of something else.
 */
export function cutOut(src: Pixels, box: Box, pad: number, leave: (rgba: number) => boolean = () => false): Pixels {
  const out = blank(box.w + 2 * pad, box.h + 2 * pad);
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = (box.y + y) * src.w + box.x + x;
      if (leave(src.data[i])) continue;
      out.data[(y + pad) * out.w + x + pad] = src.data[i];
      src.data[i] = 0;
    }
  }
  return out;
}

/** Double the size, rounding off diagonal edges (the Scale2x / EPX rule). */
export function scale2x(src: Pixels): Pixels {
  const { w, h, data } = src;
  const out = blank(w * 2, h * 2);
  const at = (x: number, y: number) => data[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = at(x, y);
      const up = at(x, y - 1), right = at(x + 1, y), left = at(x - 1, y), down = at(x, y + 1);
      // Each quarter of the pixel takes a neighbour's colour only where two neighbours agree,
      // which is exactly where a diagonal edge passes through.
      const o = 2 * y * out.w + 2 * x;
      out.data[o] = left === up && left !== down && up !== right ? up : p;
      out.data[o + 1] = up === right && up !== left && right !== down ? right : p;
      out.data[o + out.w] = down === left && down !== right && left !== up ? left : p;
      out.data[o + out.w + 1] = right === down && right !== up && down !== left ? down : p;
    }
  }
  return out;
}

/** Scale2x three times: the 8x-detailed copy that rotations are sampled from. */
export const UPSCALE = 8;
export function upscale(src: Pixels): Pixels {
  return scale2x(scale2x(scale2x(src)));
}

/**
 * The part turned `degrees` clockwise about `pivot` (in the part's own pixels), at the part's
 * original size. `big` is the part after upscale().
 */
export function rotate(big: Pixels, degrees: number, pivot: Point): Pixels {
  const w = big.w / UPSCALE, h = big.h / UPSCALE;
  const out = blank(w, h);
  const rad = (-degrees * Math.PI) / 180; // undo the turn to find where each pixel came from
  const cos = Math.cos(rad), sin = Math.sin(rad);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - pivot.x, dy = y + 0.5 - pivot.y; // from the pixel's centre
      const sx = Math.floor((pivot.x + dx * cos - dy * sin) * UPSCALE);
      const sy = Math.floor((pivot.y + dx * sin + dy * cos) * UPSCALE);
      if (sx >= 0 && sy >= 0 && sx < big.w && sy < big.h) out.data[y * w + x] = big.data[sy * big.w + sx];
    }
  }
  return out;
}
