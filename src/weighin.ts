// One weigh-in: an anchor object on the left pan, counterweights multiplied onto the right.
// Objects live in data/objects.json (weights in pounds, US units throughout) and the day's
// pairs in data/weighins.json, which refers to objects by id. Sources and certainty notes
// stay in the JSON for our own fact-checking and are never shown to players (see DESIGN.md).

import objectData from "./data/objects.json";
import weighinData from "./data/weighins.json";

/** "everyday" objects anyone can picture; "obscure" ones are the wild facts. */
export type Familiarity = "everyday" | "obscure";

export interface WeighObject {
  name: string;
  plural: string;
  /** Goes before the name in the question: "the Eiffel Tower", "a school bus". */
  article: string;
  lb: number;
  familiarity: Familiarity;
  category: string;
  /** Id of an SVG <symbol> in index.html. Objects without art yet fall back to a plain weight. */
  icon?: string;
  /** Internal: how solid the weight is (average, estimate, range...). */
  certainty: string;
  /** Internal: where the weight came from. */
  source: string;
}

export interface Weighin {
  anchor: WeighObject;
  counter: WeighObject;
  funFact: string;
}

/** A weigh-in as stored in weighins.json: object ids instead of full records. */
export interface WeighinRef {
  anchor: string;
  counter: string;
  funFact: string;
}

/** Resolve ids against the object database, failing loudly on a typo rather than mid-game. */
export function buildWeighins(objects: Record<string, WeighObject>, refs: WeighinRef[]): Weighin[] {
  const find = (id: string) => {
    const obj = objects[id];
    if (!obj) throw new Error(`Unknown object id "${id}" in weighins.json`);
    return obj;
  };
  return refs.map((r) => ({ anchor: find(r.anchor), counter: find(r.counter), funFact: r.funFact }));
}

// The cast is needed because TypeScript reads JSON strings as plain `string`, not as the
// Familiarity union; weighin.test.ts checks the real data matches the types.
export const OBJECTS = objectData as Record<string, WeighObject>;

/** Today's weigh-ins, in play order. Later this is picked by date from a pre-shuffled list. */
export const WEIGHINS: Weighin[] = buildWeighins(OBJECTS, weighinData);

/** The exact balance count (not rounded), used to drive the physical tilt. */
export function exactAnswer(w: Weighin): number {
  return w.anchor.lb / w.counter.lb;
}

/** The clean number shown in the reveal. */
export function displayAnswer(w: Weighin): number {
  return Math.round(exactAnswer(w));
}
