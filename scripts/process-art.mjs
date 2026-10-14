// Turns raw generated art (art/raw/*.jpg) into game-ready sprites (src/assets/art/*.png).
//
// Image generators draw "pixel art" as big blurry blocks on a huge canvas, with a flat magenta
// backdrop instead of transparency. For each image this script:
//   1. measures how big one art pixel is (the block size),
//   2. shrinks the image by sampling the middle of every block, giving true 1:1 pixels,
//   3. makes the magenta backdrop transparent,
//   4. trims the empty border.
// The browser then scales the tiny result back up with `image-rendering: pixelated`.
//
// Run with: npm run art

import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const RAW = "art/raw";
const OUT = "src/assets/art";

// The pirate is the style anchor. The targets below are for art at twice his original detail
// (88 x 120 pirate): every sprite is shrunk to that pixel size (`px` = width in art pixels,
// `max` = longest side) so the scene shares one grid. Art that is still at the old, coarser
// size is never enlarged; it keeps its bigger pixels until it is redrawn.

/**
 * Find a raw file by name, whatever image format it was saved in. To replace a piece of art,
 * save the new image under the same name in the same folder (see art/README.md) and rerun.
 */
function rawFile(name) {
  for (const ext of ["png", "jpg", "jpeg", "webp", "avif"]) {
    if (existsSync(`${RAW}/${name}.${ext}`)) return `${RAW}/${name}.${ext}`;
  }
  return null;
}

/**
 * trim: false keeps the empty border, for layers cut from one picture that must stay aligned.
 * name: raw file, as folder/name without extension. crop: [left, top, right, bottom] as fractions of the raw
 * image, for sheets holding several sprites. erase: a box (same units) to blank out, for a
 * neighbouring sprite that pokes into the crop. key: false keeps the backdrop (sky, sea).
 * backdrop: "white" for art drawn on white instead of magenta; holes: output pixels inside
 * enclosed white gaps that should be cleared too.
 */
const JOBS = [
  {
    name: "characters/pirate",
    out: "pirate",
    px: 88,
  },
  { name: "scene/sky", out: "sky", key: false },
  { name: "scene/clouds", out: "cloud-1", crop: [0.0, 0.2, 0.25, 0.8], px: 40 },
  { name: "scene/clouds", out: "cloud-2", crop: [0.25, 0.2, 0.5, 0.8], px: 40 },
  { name: "scene/clouds", out: "cloud-3", crop: [0.5, 0.2, 0.75, 0.8], px: 40 },
  { name: "scene/clouds", out: "cloud-4", crop: [0.75, 0.2, 1.0, 0.8], px: 40 },
  { name: "scene/sea", out: "sea", key: false, crop: [0, 0.41, 1, 0.7], px: 248 },
  { name: "scene/town", out: "town", px: 64 },
  // The harbour market (art/raw/reference/market-mood.jpg cut into layers). The market and its
  // ships come from one picture, so they are left untrimmed and full-frame: drawn at the same
  // spot, they line up. About 3.4 raw pixels per art pixel, which sits on the pirate's grid.
  { name: "scene/market", out: "market", block: 3.4, trim: false },
  { name: "scene/ship-left", out: "ship-left", block: 3.4, trim: false },
  { name: "scene/ship-right", out: "ship-right", block: 3.4, trim: false },
  // Generated at its own pixel size (about 5.7 raw pixels per art pixel), which is already the
  // pirate's grid, so no shrinking: it repeats sideways as a pattern (index.html).
  { name: "scene/dock", out: "dock", block: 5.73 },
  { name: "props/barrel", out: "barrel", px: 44 },
  { name: "props/scale-parts", out: "scale-stand", crop: [0.0, 0.03, 0.2, 0.97], px: 20 },
  { name: "props/scale-parts", out: "scale-beam", crop: [0.2, 0.36, 0.72, 0.62], px: 84 },
  { name: "props/scale-parts", out: "scale-pan", crop: [0.72, 0.08, 1.0, 0.92], px: 28 },
  // Until a plain horse is generated (art/raw/objects/horse), use the Trojan Horse with its wheels cut off.
  rawFile("objects/horse")
    ? { name: "objects/horse", block: 15, max: 32 }
    : { name: "objects/trojan-horse", out: "objects/horse", block: 15, crop: [0.15, 0.25, 0.9, 0.645], max: 32 },
  ...["adult-human", "trojan-horse", "mosasaurus", "dodo", "gigantopithecus", "chicken-heart", "boeing-747", "hummingbird"].map(
    (name) => ({ name: `objects/${name}`, block: 15, max: 32 }),
  ),
];

/** Background if it is close to pure magenta (the generator's magenta drifts toward pink). */
const isMagenta = (r, g, b) => r > 170 && b > 150 && g < 110 && r - g > 90 && b - g > 70;
/** Dark purple: backdrop that bled into an outline pixel. It gets repainted as outline. */
const isFringe = (r, g, b) => Math.min(r, b) > g * 2 + 25 && Math.abs(r - b) < 90;
const OUTLINE = [31, 26, 23];

/**
 * Estimate the block size: walk along rows and columns and record how far apart the colour
 * changes are. Changes only happen on block edges, so the most common spacing is the block size.
 */
function blockSize(px, w, h) {
  const counts = new Map();
  const tally = (length, at) => {
    let last = 0;
    let prev = null;
    for (let i = 0; i < length; i++) {
      const o = at(i) * 3;
      const colour = (px[o] >> 5 << 6) | (px[o + 1] >> 5 << 3) | (px[o + 2] >> 5); // coarse, ignores JPEG noise
      if (prev !== null && colour !== prev) {
        const gap = i - last;
        if (gap >= 6 && gap <= 64) counts.set(gap, (counts.get(gap) ?? 0) + 1);
        last = i;
      }
      prev = colour;
    }
  };
  for (let y = 0; y < h; y += 7) tally(w, (x) => y * w + x);
  for (let x = 0; x < w; x += 7) tally(h, (y) => y * w + x);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : 8;
}

/**
 * A white backdrop can't be removed by colour alone, because the art has white in it too (eyes,
 * cuffs). Instead, flood in from the image edges: only white that touches the outside is cleared.
 */
function clearFromEdges(rgba, w, h, holes) {
  const isWhite = (i) => rgba[i * 4] > 215 && rgba[i * 4 + 1] > 215 && rgba[i * 4 + 2] > 215;
  const queue = holes.map(([x, y]) => y * w + x);
  for (let x = 0; x < w; x++) queue.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);
  while (queue.length) {
    const i = queue.pop();
    if (rgba[i * 4 + 3] === 0 || !isWhite(i)) continue;
    rgba[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) queue.push(i - 1);
    if (x < w - 1) queue.push(i + 1);
    if (i >= w) queue.push(i - w);
    if (i < (h - 1) * w) queue.push(i + w);
  }
}

/**
 * Shrink a sprite onto a coarser pixel grid. Each new pixel takes the most common colour of the
 * old pixels it covers, which keeps outlines crisp where averaging would smear them. A cell
 * counts as solid if at least a fifth of it is, so thin parts like chains survive.
 */
function shrink(rgba, w, h, tw, th) {
  const out = Buffer.alloc(tw * th * 4);
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor((tx * w) / tw), x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * w) / tw));
      const y0 = Math.floor((ty * h) / th), y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * h) / th));
      const votes = new Map();
      let solid = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          if (rgba[i + 3] === 0) continue;
          solid++;
          const key = (rgba[i] >> 3 << 10) | (rgba[i + 1] >> 3 << 5) | (rgba[i + 2] >> 3); // near-identical shades vote together
          const v = votes.get(key) ?? { n: 0, i };
          v.n++;
          votes.set(key, v);
        }
      }
      if (solid < (x1 - x0) * (y1 - y0) * 0.2) continue; // stays transparent
      const best = [...votes.values()].sort((a, b) => b.n - a.n)[0];
      out.set([rgba[best.i], rgba[best.i + 1], rgba[best.i + 2], 255], (ty * tw + tx) * 4);
    }
  }
  return out;
}

mkdirSync(`${OUT}/objects`, { recursive: true });

for (const job of JOBS) {
  const source = rawFile(job.name);
  if (!source) {
    console.warn(`MISSING  ${RAW}/${job.name}.*  (skipped)`);
    continue;
  }
  let img = sharp(source).removeAlpha();
  const meta = await img.metadata();
  if (job.crop) {
    const [l, t, r, b] = job.crop;
    img = img.extract({
      left: Math.round(l * meta.width),
      top: Math.round(t * meta.height),
      width: Math.round((r - l) * meta.width),
      height: Math.round((b - t) * meta.height),
    });
  }
  const { data: px, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const block = job.block ?? blockSize(px, info.width, info.height);
  // The erase box is given in whole-image fractions; convert it to pixels inside the crop.
  const [cl, ct] = job.crop ?? [0, 0];
  const erase = job.erase?.map((f, i) => Math.round((f - (i % 2 ? ct : cl)) * (i % 2 ? meta.height : meta.width)));

  // One output pixel per block, taken from the block's centre where the colour is cleanest.
  const w = Math.floor(info.width / block);
  const h = Math.floor(info.height / block);
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(info.width - 1, Math.floor((x + 0.5) * block));
      const sy = Math.min(info.height - 1, Math.floor((y + 0.5) * block));
      const s = (sy * info.width + sx) * 3;
      let [r, g, b] = [px[s], px[s + 1], px[s + 2]];
      const erased = erase && sx >= erase[0] && sx < erase[2] && sy >= erase[1] && sy < erase[3];
      const clear = erased || (job.key !== false && isMagenta(r, g, b));
      if (!clear && job.key !== false && isFringe(r, g, b)) [r, g, b] = OUTLINE;
      out.set([r, g, b, clear ? 0 : 255], (y * w + x) * 4);
    }
  }

  if (job.backdrop === "white") clearFromEdges(out, w, h, job.holes ?? []);

  for (const [x, y, rgb] of job.paint ?? []) out.set(rgb, (y * w + x) * 4);

  let result = sharp(out, { raw: { width: w, height: h, channels: 4 } });
  if (job.key !== false && job.trim !== false) result = result.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 });
  if (job.px || job.max) {
    // Trim first, then shrink, so the target size describes the sprite itself.
    const { data, info: t } = await result.raw().toBuffer({ resolveWithObject: true });
    const scale = Math.min(1, job.px ? job.px / t.width : job.max / Math.max(t.width, t.height)); // never enlarge
    const [tw, th] = [Math.max(1, Math.round(t.width * scale)), Math.max(1, Math.round(t.height * scale))];
    result = sharp(shrink(data, t.width, t.height, tw, th), { raw: { width: tw, height: th, channels: 4 } });
  }
  const file = `${OUT}/${job.out ?? job.name}.png`;
  const written = await result.png().toFile(file);
  console.log(`${file}  block ${block}px  ->  ${written.width}x${written.height}`);
}
