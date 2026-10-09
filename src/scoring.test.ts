import { describe, expect, it } from "vitest";
import { score } from "./scoring";

describe("score", () => {
  it("gives 100 for an exact guess", () => {
    expect(score(67, 67)).toMatchObject({ points: 100, label: "Level" });
  });

  it("is symmetric: 2x over and 2x under score the same", () => {
    expect(score(100, 50).points).toBe(score(25, 50).points);
  });

  it("is scale-free: 2x off scores the same on small and huge answers", () => {
    expect(score(100, 50).points).toBe(score(10_000_000, 5_000_000).points);
  });

  it("scores each band, including exact boundaries", () => {
    expect(score(110, 100).points).toBe(100); // +10%
    expect(score(150, 100).points).toBe(75); // 1.5x
    expect(score(300, 100).points).toBe(50); // 3x
    expect(score(1000, 100).points).toBe(20); // 10x
    expect(score(1001, 100).points).toBe(0); // just past 10x
  });
});
