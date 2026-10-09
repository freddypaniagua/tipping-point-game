// Ratio-based scoring (see DESIGN.md): error = |log10(guess / answer)|, so being 2x off
// costs the same on 50 whales as on 5 million ants. Bands are a starting point for playtesting.

export interface Band {
  /** Largest allowed ratio between guess and answer (in either direction) for this band. */
  maxRatio: number;
  points: number;
  /** Describes the tilt, not right/wrong. */
  label: string;
}

export const BANDS: Band[] = [
  { maxRatio: 1.1, points: 100, label: "Level" },
  { maxRatio: 1.5, points: 75, label: "Slight lean" },
  { maxRatio: 3, points: 50, label: "Clear lean" },
  { maxRatio: 10, points: 20, label: "Heavy lean" },
];
const BOTTOMED_OUT: Band = { maxRatio: Infinity, points: 0, label: "Bottomed out" };

export function logError(guess: number, answer: number): number {
  return Math.abs(Math.log10(guess / answer));
}

export function score(guess: number, answer: number): Band {
  const err = logError(guess, answer);
  // The epsilon keeps exact-boundary guesses (e.g. exactly 3x) from losing to float rounding.
  return BANDS.find((b) => err <= Math.log10(b.maxRatio) + 1e-9) ?? BOTTOMED_OUT;
}
