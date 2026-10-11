// "How did everyone else do today?" The site is static, so this needs a small stats server.
// Until one exists (VITE_STATS_URL unset) everything here is skipped and the results screen
// shows only what this browser knows.
//
// The contract the server has to meet:
//
//   POST {VITE_STATS_URL}/results   body: { "day": "2026-10-11", "guesses": [6, 50, ...], "total": 220 }
//   GET  {VITE_STATS_URL}/stats?day=2026-10-11
//        -> { "players": 1204, "totals": { "220": 31, "245": 18, ... }, "medianGuesses": [6, 30, ...] }
//
// `totals` maps a total score to how many players got it; `medianGuesses` has one entry per
// weigh-in. The median is used instead of the mean because guesses span orders of magnitude:
// a single guess of a billion would drag a mean far away from what people typically said.

import { totalPoints, type RoundResult } from "./results";

export interface CrowdStats {
  players: number;
  totals: Record<string, number>;
  medianGuesses: number[];
}

/** Below this many players the numbers say more about individuals than about "everyone". */
export const MIN_PLAYERS = 5;

const STATS_URL: string | undefined = import.meta.env.VITE_STATS_URL;
const TIMEOUT_MS = 5000;

/** The key for today's set. Everyone shares one set per UTC day until day numbers exist. */
export function dayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const isCount = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

/** The server's reply is outside data: check its shape and return null if anything is off. */
export function parseStats(data: unknown, rounds: number): CrowdStats | null {
  if (typeof data !== "object" || data === null) return null;
  const { players, totals, medianGuesses } = data as Record<string, unknown>;
  if (!isCount(players)) return null;
  if (typeof totals !== "object" || totals === null) return null;
  if (!Object.entries(totals).every(([score, count]) => isCount(Number(score)) && isCount(count))) return null;
  if (!Array.isArray(medianGuesses) || medianGuesses.length !== rounds) return null;
  if (!medianGuesses.every((g) => isCount(g) && g >= 1)) return null;
  return { players, totals: totals as Record<string, number>, medianGuesses };
}

/** Whole-number percent of today's players who scored lower than `total`. */
export function percentBeaten(total: number, totals: Record<string, number>): number {
  let lower = 0;
  let all = 0;
  for (const [score, count] of Object.entries(totals)) {
    all += count;
    if (Number(score) < total) lower += count;
  }
  return all === 0 ? 0 : Math.round((lower / all) * 100);
}

/** One browser sends its result once per day, so a reload doesn't count the same player twice. */
function alreadySent(day: string): boolean {
  try {
    return localStorage.getItem(`sent:${day}`) !== null;
  } catch {
    return false; // storage blocked (private mode): worst case is a duplicate entry
  }
}

function markSent(day: string) {
  try {
    localStorage.setItem(`sent:${day}`, "1");
  } catch {
    // nothing to do; see alreadySent
  }
}

/**
 * Send this player's day and fetch everyone's. Resolves to null when there is no server,
 * it is slow or down, or it has too few players: the results screen works without it.
 */
export async function loadCrowd(rounds: RoundResult[], day = dayKey()): Promise<CrowdStats | null> {
  if (!STATS_URL) return null;
  try {
    if (!alreadySent(day)) {
      const body = JSON.stringify({ day, guesses: rounds.map((r) => r.guess), total: totalPoints(rounds) });
      const sent = await fetch(`${STATS_URL}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (sent.ok) markSent(day);
    }
    const reply = await fetch(`${STATS_URL}/stats?day=${day}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!reply.ok) return null;
    const stats = parseStats(await reply.json(), rounds.length);
    return stats && stats.players >= MIN_PLAYERS ? stats : null;
  } catch {
    return null;
  }
}

/** Made-up numbers so the layout can be seen during development. Never used in production. */
export const SAMPLE_STATS: CrowdStats = {
  players: 1204,
  totals: { "0": 40, "90": 180, "170": 310, "220": 260, "295": 240, "370": 130, "450": 44 },
  medianGuesses: [5, 40, 500, 3000, 2000000],
};
