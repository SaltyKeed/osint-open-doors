import { describe, expect, it } from "vitest";
import { nameMatches, nameSideBySide } from "./name-match";

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

describe("nameSideBySide", () => {
  it.each([
    ["Résultats : Léa Martin, 2e", "Léa Martin"],
    ["MARTIN Léa (Neuchâtel)", "Lea Martin"],
    ["Martin, Léa", "Léa Martin"],
  ])("%s holds %s side by side", (text, name) => expect(nameSideBySide(text, name)).toBe(true));

  it.each([
    // Two people of a list: the first name of one, the last name of the other.
    ["Léa Dupont, Paul Martin", "Léa Martin"],
    ["Léa Martinez", "Léa Martin"],
    ["Léa", "Léa Martin"],
  ])("%s does not hold %s side by side", (text, name) => expect(nameSideBySide(text, name)).toBe(false));
});
