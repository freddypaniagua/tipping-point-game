import { describe, expect, it } from "vitest";
import { rating, recordRound, shareText, tiltDegrees, totalPoints } from "./results";
import { buildWeighins, type WeighObject } from "./weighin";

const obj = (name: string, lb: number): WeighObject => ({
  name,
  plural: `${name}s`,
  article: "a",
  lb,
  familiarity: "everyday",
  category: "test",
  certainty: "",
  source: "",
});

// One weigh-in whose answer is exactly 50.
const [weighin] = buildWeighins({ big: obj("big", 5000), small: obj("small", 100) }, [
  { anchor: "big", counter: "small", funFact: "" },
]);
const rounds = (...guesses: number[]) => guesses.map((g) => recordRound(weighin, g));

describe("results", () => {
  it("records the guess, the shown answer and the band", () => {
    expect(recordRound(weighin, 70)).toMatchObject({ guess: 70, answer: 50, band: { points: 75 } });
  });

  it("adds up the points", () => {
    expect(totalPoints(rounds(50, 70, 140, 400, 5000))).toBe(100 + 75 + 50 + 20 + 0);
  });

  it("rates the day by share of the maximum score", () => {
    expect(rating(rounds(50, 50, 50, 50, 50))).toBe("Perfectly balanced");
    expect(rating(rounds(50, 70, 140, 400, 5000))).toBe("A bit lopsided");
    expect(rating(rounds(5000, 5000, 5000, 5000, 5000))).toBe("Tipped over");
  });

  it("leans right for too many, left for too few, and tops out at 10x", () => {
    const [level, over, under, wayOver] = rounds(50, 100, 25, 50_000);
    expect(tiltDegrees(level)).toBeCloseTo(0);
    expect(tiltDegrees(over)).toBeGreaterThan(0);
    expect(tiltDegrees(under)).toBeCloseTo(-tiltDegrees(over));
    expect(tiltDegrees(wayOver)).toBe(25);
  });

  it("builds share text with the total and one square per round, no answers", () => {
    expect(shareText(rounds(50, 70, 140, 400, 5000))).toBe("Tipping Point · 245/500\n🟩🟨🟧🟥⬛");
  });
});
