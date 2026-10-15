// Where the counterweights go in the pan: a heap, with rows of 4, 3, 2 and 1 from the floor up,
// each row resting on the one below. Every row fills from the middle outward, the way things
// tipped into a dish settle. Past the top of the heap, the counter carries the rest.

const ROWS = [4, 3, 2, 1];
export const HEAP_CAP = ROWS.reduce((a, b) => a + b);

/**
 * The slot for the `index`th counterweight (from 0): its row (0 is the floor) and how far it sits
 * from the middle, in slot widths. Null once the heap is full.
 */
export function heapSlot(index: number): { row: number; across: number } | null {
  let first = 0;
  for (const [row, size] of ROWS.entries()) {
    if (index < first + size) {
      const middleOut = Array.from({ length: size }, (_, i) => i - (size - 1) / 2).sort(
        (a, b) => Math.abs(a) - Math.abs(b) || a - b,
      );
      return { row, across: middleOut[index - first] };
    }
    first += size;
  }
  return null;
}
