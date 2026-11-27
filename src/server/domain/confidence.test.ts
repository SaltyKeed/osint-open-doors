import { describe, expect, it } from "vitest";
import { assessConfidence, isDetailed, MAX_HOMONYMS, shouldRebound, type Confidence, type Evidence } from "./confidence";
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

describe("assessConfidence for a pseudo found on a list of sites (T9)", () => {
  const base = { linkedToConfirmed: false, coherentHints: 0, existenceCheck: true };
  const queried = { type: "PSEUDO" as const, confidence: "confirmed" as const };

  it("keeps hidden a full profile found by a rare pseudo on a source without a list of sites", () => {
    // GitHub or Hudson Rock return a name, an email, a city: never shown for a stranger.
    expect(assessConfidence({ ...base, existenceCheck: false, queried, rarePseudo: true })).toBe("possible");
  });

  it("asks the visitor about an account found by a rare pseudo, without hint", () => {
    expect(assessConfidence({ ...base, queried, rarePseudo: true })).toBe("to_confirm");
  });

  it("keeps an account with a coherent hint probable", () => {
    expect(assessConfidence({ ...base, queried, rarePseudo: true, coherentHints: 1 })).toBe("probable");
  });

  it("does not ask about a short or common pseudo", () => {
    expect(assessConfidence({ ...base, queried, rarePseudo: false })).toBe("possible");
  });

  it("asks too when the pseudo searched was only probable", () => {
    expect(assessConfidence({ ...base, queried: { type: "PSEUDO", confidence: "probable" }, rarePseudo: true })).toBe(
      "to_confirm",
    );
  });

  it("does not apply to a name", () => {
    expect(assessConfidence({ ...base, queried: { type: "NOM", confidence: "confirmed" }, rarePseudo: false })).toBe("namesake");
  });
});

describe("assessConfidence for a name with few homonyms (T13)", () => {
  const evidence: Evidence = {
    queried: { type: "NOM", confidence: "confirmed" },
    linkedToConfirmed: false,
    rarePseudo: false,
    coherentHints: 0,
  };

  it("asks the visitor when the source knows at most MAX_HOMONYMS people of this name", () => {
    expect(MAX_HOMONYMS).toBe(3);
    expect(assessConfidence({ ...evidence, fewHomonyms: true })).toBe("to_confirm");
  });

  it("keeps a namesake without the flag", () => {
    expect(assessConfidence(evidence)).toBe("namesake");
    expect(assessConfidence({ ...evidence, fewHomonyms: false })).toBe("namesake");
  });

  it("keeps a coherent hint possible, as before", () => {
    expect(assessConfidence({ ...evidence, coherentHints: 1, fewHomonyms: true })).toBe("possible");
  });
});

describe("isDetailed", () => {
  it.each<[Confidence, boolean]>([
    ["confirmed", true],
    ["probable", true],
    ["to_confirm", false],
    ["possible", false],
    ["namesake", false],
  ])("%s is detailed: %s", (confidence, expected) => {
    expect(isDetailed(confidence)).toBe(expected);
  });
});

describe("an account to confirm", () => {
  it("never searches again", () => {
    const lead = {
      identifier: { type: "PROFIL" as const, value: "https://exemple.ch/lmartin_06" },
      confidence: "to_confirm" as const,
      about: "subject" as const,
      foundFrom: "confirmed" as const,
    };
    expect(shouldRebound(lead)).toBe(false);
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
