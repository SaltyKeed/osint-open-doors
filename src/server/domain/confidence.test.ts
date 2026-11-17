import { describe, expect, it } from "vitest";
import { assessConfidence, isDetailed, shouldRebound, type Confidence, type Evidence } from "./confidence";
import type { IdentifierType } from "./identifier";

// All values below are invented test data.

describe("assessConfidence", () => {
  it.each<[IdentifierType, Confidence, boolean, boolean, number, Confidence]>([
    // queried type, queried confidence, linked to confirmed, rare pseudo, hints, expected
    ["NOM", "confirmed", true, false, 0, "confirmed"],
    ["PSEUDO", "probable", true, false, 0, "confirmed"],
    ["EMAIL", "confirmed", false, false, 0, "confirmed"],
    ["EMAIL", "probable", false, false, 0, "probable"],
    ["PSEUDO", "confirmed", false, true, 1, "probable"],
    ["PSEUDO", "confirmed", false, true, 0, "possible"],
    ["PSEUDO", "confirmed", false, false, 2, "possible"],
    ["NOM", "confirmed", false, false, 1, "possible"],
    ["NOM", "confirmed", false, false, 0, "namesake"],
    ["IP", "confirmed", false, false, 3, "possible"],
    ["ORGA", "confirmed", false, false, 3, "possible"],
    ["PSEUDO", "probable", false, true, 1, "probable"],
  ])("%s %s, linked %s, rare %s, %i hints: %s", (type, confidence, linkedToConfirmed, rarePseudo, coherentHints, expected) => {
    const evidence: Evidence = { queried: { type, confidence }, linkedToConfirmed, rarePseudo, coherentHints };
    expect(assessConfidence(evidence)).toBe(expected);
  });
});

describe("isDetailed", () => {
  it.each<[Confidence, boolean]>([
    ["confirmed", true],
    ["probable", true],
    ["possible", false],
    ["namesake", false],
  ])("%s is detailed: %s", (confidence, expected) => {
    expect(isDetailed(confidence)).toBe(expected);
  });
});

describe("shouldRebound", () => {
  it.each<[IdentifierType, Confidence, "subject" | "relative", Confidence, boolean]>([
    // type, confidence, about, found from, expected
    ["PSEUDO", "probable", "subject", "confirmed", true],
    ["NOM", "confirmed", "subject", "confirmed", false],
    ["EMAIL", "confirmed", "relative", "confirmed", false],
    ["EMAIL", "possible", "subject", "confirmed", false],
    ["PSEUDO", "probable", "subject", "probable", false],
    ["EMAIL", "confirmed", "subject", "probable", true],
  ])("%s %s about %s found from %s: %s", (type, confidence, about, foundFrom, expected) => {
    const lead = { identifier: { type, value: "invented" }, confidence, about, foundFrom };
    expect(shouldRebound(lead)).toBe(expected);
  });
});
