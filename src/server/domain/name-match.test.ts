import { describe, expect, it } from "vitest";
import { nameMatches } from "./name-match";

// All values below are invented test data.

describe("nameMatches", () => {
  it.each([
    ["Léa Martin", "Léa Martin"],
    ["LEA MARTIN", "Léa Martin"],
    ["Léa Martin (@lmartin_06) • Instagram", "Lea Martin"],
    ["Martin Léa", "Léa Martin"],
    ["Jean-Pierre Dupont", "Jean-Pierre Dupont"],
  ])("%s matches %s", (displayed, confirmed) => expect(nameMatches(displayed, confirmed)).toBe(true));

  it.each([
    ["Léa Martinez", "Léa Martin"],
    ["Léa", "Léa Martin"],
    ["lmartin_06", "Léa Martin"],
    ["", "Léa Martin"],
  ])("%s does not match %s", (displayed, confirmed) => expect(nameMatches(displayed, confirmed)).toBe(false));
});
