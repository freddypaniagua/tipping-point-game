import { describe, expect, it } from "vitest";
import { blank, cutOut, rotate, scale2x, upscale, UPSCALE, type Pixels } from "./rig";

const A = 0xff0000ff, B = 0xff00ff00;

function image(rows: string[]): Pixels {
  const img = blank(rows[0].length, rows.length);
  rows.forEach((row, y) => [...row].forEach((c, x) => (img.data[y * img.w + x] = c === "#" ? A : c === "o" ? B : 0)));
  return img;
}
const show = (img: Pixels) =>
  Array.from({ length: img.h }, (_, y) =>
    Array.from(img.data.slice(y * img.w, (y + 1) * img.w), (v) => (v === A ? "#" : v === B ? "o" : ".")).join(""),
  );

describe("cutOut", () => {
  it("moves the box into a padded image and leaves a hole behind", () => {
    const src = image(["##o", "#oo"]);
    const part = cutOut(src, { x: 1, y: 0, w: 2, h: 1 }, 1);
    expect(show(part)).toEqual(["....", ".#o.", "...."]);
    expect(show(src)).toEqual(["#..", "#oo"]);
  });

  it("leaves behind the pixels it is told to", () => {
    const src = image(["#o#"]);
    const part = cutOut(src, { x: 0, y: 0, w: 3, h: 1 }, 0, (v) => v === B);
    expect(show(part)).toEqual(["#.#"]);
    expect(show(src)).toEqual([".o."]);
  });
});

describe("scale2x", () => {
  it("turns a lone pixel into a plain 2x2 block", () => {
    expect(show(scale2x(image([".....", "..#..", "....."])))).toEqual([
      "..........",
      "..........",
      "....##....",
      "....##....",
      "..........",
      "..........",
    ]);
  });

  it("rounds off a diagonal instead of making a staircase of blocks", () => {
    expect(show(scale2x(image(["#.", "##"])))).toEqual(["##..", "###.", "####", "####"]);
  });
});

describe("rotate", () => {
  const part = image([".....", ".###.", ".#o#.", ".###.", "....."]);
  const big = upscale(part);

  it("upscales 8x", () => {
    expect(big.w).toBe(5 * UPSCALE);
  });

  it("leaves the part unchanged at 0 degrees", () => {
    expect(show(rotate(big, 0, { x: 2.5, y: 2.5 }))).toEqual(show(part));
  });

  it("turns clockwise about the pivot", () => {
    const bar = image([".....", ".....", "..###", ".....", "....."]); // pointing right
    const down = rotate(upscale(bar), 90, { x: 2.5, y: 2.5 });
    expect(show(down)).toEqual([".....", ".....", "..#..", "..#..", "..#.."]); // now pointing down
  });
});
