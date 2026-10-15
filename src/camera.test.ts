import { describe, expect, it } from "vitest";
import { CLOSE, SCENE, WIDE, between, fit } from "./camera";

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

  it("leaves a view alone when the window shows nothing past the picture", () => {
    expect(fit(WIDE, 0.5)).toEqual(WIDE); // a phone: only the view's own width is shown
  });

  it("never shows past the picture's sides in a very wide window", () => {
    const aspect = 3;
    const v = fit(WIDE, aspect);
    const shown = Math.max(v.w, v.h * aspect);
    const cx = v.x + v.w / 2;
    expect(cx - shown / 2).toBeGreaterThanOrEqual(SCENE.left - 1e-9);
    expect(cx + shown / 2).toBeLessThanOrEqual(SCENE.right + 1e-9);
    expect(v.y + v.h).toBeCloseTo(WIDE.y + WIDE.h); // it crops sky, not the boardwalk
  });
});
