import { describe, expect, it } from "vitest";
import { SAMPLE_STATS, dayKey, parseStats, percentBeaten } from "./crowd";

describe("dayKey", () => {
  it("is the UTC date, so every player shares one key per day", () => {
    expect(dayKey(new Date("2026-10-11T23:59:59Z"))).toBe("2026-10-11");
  });
});

describe("percentBeaten", () => {
  const totals = { "100": 1, "200": 2, "300": 1 };

  it("counts only players with a strictly lower total", () => {
    expect(percentBeaten(200, totals)).toBe(25);
    expect(percentBeaten(300, totals)).toBe(75);
    expect(percentBeaten(100, totals)).toBe(0);
  });

  it("is 0 when nobody has played", () => {
    expect(percentBeaten(500, {})).toBe(0);
  });
});

describe("parseStats", () => {
  const good = { players: 12, totals: { "220": 7, "300": 5 }, medianGuesses: [6, 30, 500, 9000, 1000000] };

  it("accepts a well-formed reply", () => {
    expect(parseStats(good, 5)).toEqual(good);
    expect(parseStats(SAMPLE_STATS, 5)).toEqual(SAMPLE_STATS);
  });

  it("rejects replies that don't match the contract", () => {
    expect(parseStats(null, 5)).toBeNull();
    expect(parseStats("oops", 5)).toBeNull();
    expect(parseStats({ ...good, players: "12" }, 5)).toBeNull();
    expect(parseStats({ ...good, totals: { "220": -1 } }, 5)).toBeNull();
    expect(parseStats({ ...good, totals: { high: 3 } }, 5)).toBeNull();
    expect(parseStats({ ...good, medianGuesses: [6, 30] }, 5)).toBeNull(); // wrong number of rounds
    expect(parseStats({ ...good, medianGuesses: [6, 30, 500, 9000, "lots"] }, 5)).toBeNull();
  });
});
