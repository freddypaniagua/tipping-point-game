import { describe, expect, it } from "vitest";
import { withCommas } from "./input";

describe("withCommas", () => {
  it("groups thousands", () => {
    expect(withCommas("7")).toBe("7");
    expect(withCommas("1000")).toBe("1,000");
    expect(withCommas("1234567")).toBe("1,234,567");
    expect(withCommas("1000000000")).toBe("1,000,000,000");
  });
});
