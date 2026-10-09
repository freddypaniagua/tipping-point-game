// One weigh-in: an anchor object on the left pan, counterweights multiplied onto the right.
// Weights are in kg. Sources stay internal (see DESIGN.md) and are never shown to players.

export interface WeighObject {
  name: string;
  plural: string;
  kg: number;
}

export interface Weighin {
  anchor: WeighObject;
  counter: WeighObject;
  funFact: string;
}

// Hard-coded for the first milestone; later this comes from the JSON object database.
export const EIFFEL_VS_WHALES: Weighin = {
  anchor: { name: "Eiffel Tower", plural: "Eiffel Towers", kg: 10_100_000 }, // ~10,100 t total
  counter: { name: "blue whale", plural: "blue whales", kg: 150_000 }, // average adult
  funFact:
    "Every seven years the tower gets about 60 tonnes of fresh paint, which is still less than half a blue whale.",
};

/** The exact balance count (not rounded), used to drive the physical tilt. */
export function exactAnswer(w: Weighin): number {
  return w.anchor.kg / w.counter.kg;
}

/** The clean number shown in the reveal. */
export function displayAnswer(w: Weighin): number {
  return Math.round(exactAnswer(w));
}
