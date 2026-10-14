import { describe, expect, it } from "vitest";
import { CLOSE, WIDE, between } from "./camera";

describe("camera", () => {
  it("starts at one view and ends at the other", () => {
    expect(between(WIDE, CLOSE, 0)).toEqual(WIDE);
    expect(between(WIDE, CLOSE, 1)).toEqual(CLOSE);
  });

  it("is halfway at the midpoint and moves slowly at the ends", () => {
    expect(between(WIDE, CLOSE, 0.5).w).toBeCloseTo((WIDE.w + CLOSE.w) / 2);
    const early = WIDE.w - between(WIDE, CLOSE, 0.1).w;
    const middle = between(WIDE, CLOSE, 0.45).w - between(WIDE, CLOSE, 0.55).w;
    expect(early).toBeLessThan(middle);
  });
});
