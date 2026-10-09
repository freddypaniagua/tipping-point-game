// Provisional input: a stepper that snaps through 1, 2, 3, 5, 10, 20, 30, 50, 100...
// plus typing an exact number. The input method is still an open decision (dial vs keyboard
// vs hybrid), so this is isolated behind a tiny interface that main.ts depends on.

const MAX = 100_000;

/** 1, 2, 3, 5, 10, 20, 30, 50, 100, ... up to MAX. */
const SNAPS: number[] = [];
for (let decade = 1; decade <= MAX; decade *= 10) {
  for (const m of [1, 2, 3, 5]) if (decade * m <= MAX) SNAPS.push(decade * m);
}

function nextSnap(v: number): number {
  return SNAPS.find((s) => s > v) ?? SNAPS[SNAPS.length - 1];
}

function prevSnap(v: number): number {
  return [...SNAPS].reverse().find((s) => s < v) ?? SNAPS[0];
}

export interface GuessInput {
  value(): number;
  setEnabled(enabled: boolean): void;
}

export function createGuessInput(root: HTMLElement, initial = 10): GuessInput {
  const field = root.querySelector<HTMLInputElement>("#guess")!;
  const down = root.querySelector<HTMLButtonElement>("#guess-down")!;
  const up = root.querySelector<HTMLButtonElement>("#guess-up")!;

  const read = () => {
    const n = Math.round(Number(field.value));
    return Number.isFinite(n) ? Math.min(MAX, Math.max(1, n)) : 1;
  };
  const write = (n: number) => (field.value = String(n));

  write(initial);
  down.addEventListener("click", () => write(prevSnap(read())));
  up.addEventListener("click", () => write(nextSnap(read())));
  // Normalise typed values (clamp, drop decimals) once the player leaves the field.
  field.addEventListener("change", () => write(read()));

  return {
    value: read,
    setEnabled(enabled) {
      for (const el of [field, down, up]) el.disabled = !enabled;
    },
  };
}
