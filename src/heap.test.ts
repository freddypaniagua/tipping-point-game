import { describe, expect, it } from "vitest";
import { HEAP_CAP, heapSlot } from "./heap";

describe("heapSlot", () => {
  it("fills the floor from the middle outward", () => {
    expect([0, 1, 2, 3].map(heapSlot)).toEqual([
      { row: 0, across: -0.5 },
      { row: 0, across: 0.5 },
      { row: 0, across: -1.5 },
      { row: 0, across: 1.5 },
    ]);
  });

  it("starts each row above the middle of the one below", () => {
    expect(heapSlot(4)).toEqual({ row: 1, across: 0 });
    expect(heapSlot(9)).toEqual({ row: 3, across: 0 });
  });

  it("stops at the top of the heap", () => {
    expect(HEAP_CAP).toBe(10);
    expect(heapSlot(HEAP_CAP)).toBeNull();
  });
});
