import { describe, expect, it } from "vitest";
import { MAX_GUESS } from "./input";
import { OBJECTS, WEIGHINS, buildWeighins, displayAnswer, type WeighObject } from "./weighin";

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

describe("buildWeighins", () => {
  const objects = { car: obj("car", 4000), horse: obj("horse", 1000) };

  it("resolves object ids into full weigh-ins, keeping order", () => {
    const [w] = buildWeighins(objects, [{ anchor: "car", counter: "horse", funFact: "Neigh." }]);
    expect(w.anchor.name).toBe("car");
    expect(displayAnswer(w)).toBe(4);
  });

  it("keeps big answers to two significant figures", () => {
    const objects = { ape: obj("ape", 550), heart: obj("heart", 0.018), whale: obj("whale", 330000) };
    const [big, small] = buildWeighins(objects, [
      { anchor: "ape", counter: "heart", funFact: "" }, // 30,555.6
      { anchor: "whale", counter: "ape", funFact: "" }, // 600 exactly
    ]);
    expect(displayAnswer(big)).toBe(31_000);
    expect(displayAnswer(small)).toBe(600);
  });

  it("throws on an id that isn't in the database", () => {
    expect(() => buildWeighins(objects, [{ anchor: "car", counter: "hrose", funFact: "" }])).toThrow(/hrose/);
  });
});

// Guards on the real content, so a bad edit to the JSON fails CI instead of shipping.
describe("object database", () => {
  it.each(Object.entries(OBJECTS))("%s is a complete record", (_id, o) => {
    expect(o.name && o.plural && o.article && o.category).toBeTruthy();
    expect(o.lb).toBeGreaterThan(0);
    expect(["everyday", "obscure"]).toContain(o.familiarity);
  });
});

describe("today's weigh-ins", () => {
  it("opens with a pair of everyday objects", () => {
    expect(WEIGHINS[0].anchor.familiarity).toBe("everyday");
    expect(WEIGHINS[0].counter.familiarity).toBe("everyday");
  });

  it.each(WEIGHINS)("$counter.plural vs $anchor.name has an answer the input can reach", (w) => {
    expect(displayAnswer(w)).toBeGreaterThanOrEqual(1);
    expect(displayAnswer(w)).toBeLessThanOrEqual(MAX_GUESS);
    expect(w.funFact).not.toBe("");
  });
});
