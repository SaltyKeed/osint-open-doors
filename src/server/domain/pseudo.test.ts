import { describe, expect, it } from "vitest";
import { isRarePseudo } from "./pseudo";

// All values below are invented test data.

describe("isRarePseudo", () => {
  it.each<[string, boolean, string]>([
    ["lmartin_06", true, "long, with letters"],
    ["lea", false, "shorter than 6 characters"],
    ["123456", false, "no letter"],
    ["thomas_vs_42", true, "long, with letters"],
    // Known limit: common words pass this filter; the engine catches them by the number of sites (#65).
    ["thomas", true, "common first name, not caught here"],
    ["azerty", true, "common word, not caught here"],
  ])("%s is rare: %s (%s)", (pseudo, expected) => {
    expect(isRarePseudo(pseudo)).toBe(expected);
  });
});
