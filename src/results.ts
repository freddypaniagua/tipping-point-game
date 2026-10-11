// The end-of-day summary: what the player guessed on each weigh-in, the total, an overall
// rating and the share text. Pure functions only, so main.ts just draws what these return.

import { BANDS, logError, score, type Band } from "./scoring";
import { displayAnswer, type Weighin } from "./weighin";

export interface RoundResult {
  weighin: Weighin;
  guess: number;
  /** The answer as shown to the player, which is also what the guess is scored against. */
  answer: number;
  band: Band;
}

export const MAX_POINTS_PER_ROUND = BANDS[0].points;

export function recordRound(weighin: Weighin, guess: number): RoundResult {
  const answer = displayAnswer(weighin);
  return { weighin, guess, answer, band: score(guess, answer) };
}

export function totalPoints(rounds: RoundResult[]): number {
  return rounds.reduce((sum, r) => sum + r.band.points, 0);
}

/** Overall ratings by share of the maximum score. Like the bands, they describe balance, not right/wrong. */
const RATINGS: { minShare: number; label: string }[] = [
  { minShare: 0.9, label: "Perfectly balanced" },
  { minShare: 0.7, label: "Steady hand" },
  { minShare: 0.5, label: "Finding your balance" },
  { minShare: 0.25, label: "A bit lopsided" },
  { minShare: 0, label: "Tipped over" },
];

export function rating(rounds: RoundResult[]): string {
  const share = totalPoints(rounds) / (rounds.length * MAX_POINTS_PER_ROUND);
  return RATINGS.find((r) => share >= r.minShare)!.label;
}

const MAX_TILT = 25; // degrees, reached at 10x off or worse

/**
 * How far the little beam next to each round leans. Positive means the right side is down
 * (guessed too many), negative means it lifted (too few). Uses the same log error as scoring.
 */
export function tiltDegrees(r: RoundResult): number {
  return Math.sign(r.guess - r.answer) * Math.min(1, logError(r.guess, r.answer)) * MAX_TILT;
}

// One square per band, best to worst. Shows how close each round was without spoiling answers.
const SQUARES = ["🟩", "🟨", "🟧", "🟥", "⬛"];

export function shareText(rounds: RoundResult[]): string {
  const squares = rounds.map((r) => {
    const i = BANDS.indexOf(r.band);
    return SQUARES[i === -1 ? SQUARES.length - 1 : i];
  });
  const max = rounds.length * MAX_POINTS_PER_ROUND;
  return `Tipping Point · ${totalPoints(rounds)}/${max}\n${squares.join("")}`;
}
