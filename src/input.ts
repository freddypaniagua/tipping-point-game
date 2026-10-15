// Provisional input: a stepper that snaps through 1, 2, 3, 5, 10, 20, 30, 50, 100...
// plus typing an exact number. The input method is still an open decision (dial vs keyboard
// vs hybrid), so this is isolated behind a tiny interface that main.ts depends on.

/** Largest guess the input accepts; answers must stay under this. */
export const MAX_GUESS = 1_000_000_000;

/** 1, 2, 3, 5, 10, 20, 30, 50, 100, ... up to MAX_GUESS. */
const SNAPS: number[] = [];
for (let decade = 1; decade <= MAX_GUESS; decade *= 10) {
  for (const m of [1, 2, 3, 5]) if (decade * m <= MAX_GUESS) SNAPS.push(decade * m);
}

function nextSnap(v: number): number {
  return SNAPS.find((s) => s > v) ?? SNAPS[SNAPS.length - 1];
}

function prevSnap(v: number): number {
  return [...SNAPS].reverse().find((s) => s < v) ?? SNAPS[0];
}

const digitsOf = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

/** "1234567" -> "1,234,567". Exported for testing. */
export function withCommas(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export interface GuessInput {
  value(): number;
  /** Back to the starting value, ready for the next weigh-in. */
  reset(): void;
  setEnabled(enabled: boolean): void;
}

export function createGuessInput(root: HTMLElement, initial = 10): GuessInput {
  const field = root.querySelector<HTMLInputElement>("#guess")!;
  const down = root.querySelector<HTMLButtonElement>("#guess-down")!;
  const up = root.querySelector<HTMLButtonElement>("#guess-up")!;

  // The field is plain text so it can show thousands separators (1,000,000); only digits count.
  const read = () => {
    const n = Number(digitsOf(field.value));
    return Math.min(MAX_GUESS, Math.max(1, n));
  };
  const write = (n: number) => (field.value = withCommas(String(n)));

  write(initial);
  down.addEventListener("click", () => write(prevSnap(read())));
  up.addEventListener("click", () => write(nextSnap(read())));
  // Add the commas while the player types, keeping the cursor after the same digit.
  field.addEventListener("input", () => {
    const digitsBefore = digitsOf(field.value.slice(0, field.selectionStart ?? field.value.length)).length;
    const digits = digitsOf(field.value).slice(0, String(MAX_GUESS).length);
    field.value = withCommas(digits);
    let caret = 0;
    for (let seen = 0; caret < field.value.length && seen < digitsBefore; caret++) if (/\d/.test(field.value[caret])) seen++;
    field.setSelectionRange(caret, caret);
  });
  // Normalise the value (clamp to 1 to MAX_GUESS) once the player leaves the field.
  field.addEventListener("change", () => write(read()));

  return {
    value: read,
    reset: () => write(initial),
    setEnabled(enabled) {
      for (const el of [field, down, up]) el.disabled = !enabled;
    },
  };
}
