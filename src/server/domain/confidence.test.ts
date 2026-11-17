import { describe, expect, it } from "vitest";
import { assessConfidence, combineConfidence, isDetailed, type RecordEvidence } from "./confidence";

const evidence = (over: Partial<RecordEvidence>): RecordEvidence => ({
  queried: { type: "NOM", confidence: "confirme" },
  linksToConfirmed: false,
  rarePseudo: false,
  hints: 0,
  ...over,
});

describe("assessConfidence", () => {
  it("a record holding an already confirmed identifier is confirmed", () => {
    expect(assessConfidence(evidence({ linksToConfirmed: true }))).toBe("confirme");
  });

  it("a unique identifier passes its own level to what it finds", () => {
    expect(assessConfidence(evidence({ queried: { type: "EMAIL", confidence: "confirme" } }))).toBe("confirme");
    expect(assessConfidence(evidence({ queried: { type: "PROFIL", confidence: "probable" } }))).toBe("probable");
  });

  it("a rare pseudo with a hint is probable; otherwise possible", () => {
    const pseudo = { type: "PSEUDO", confidence: "confirme" } as const;
    expect(assessConfidence(evidence({ queried: pseudo, rarePseudo: true, hints: 1 }))).toBe("probable");
    expect(assessConfidence(evidence({ queried: pseudo, rarePseudo: true }))).toBe("possible");
    expect(assessConfidence(evidence({ queried: pseudo, hints: 2 }))).toBe("possible");
  });

  it("a name, an IP or an organisation is never more than possible", () => {
    expect(assessConfidence(evidence({ hints: 3 }))).toBe("possible");
    expect(assessConfidence(evidence({}))).toBe("homonyme");
    expect(assessConfidence(evidence({ queried: { type: "IP", confidence: "confirme" } }))).toBe("homonyme");
    expect(assessConfidence(evidence({ queried: { type: "ORGA", confidence: "confirme" }, hints: 1 }))).toBe(
      "possible",
    );
  });
});

describe("combineConfidence", () => {
  const sighting = (confidence: Parameters<typeof isDetailed>[0], origin: string) => ({ confidence, origin });

  it("keeps the best level of one origin", () => {
    expect(combineConfidence([sighting("possible", "a"), sighting("probable", "a")])).toBe("probable");
  });

  it("goes up one step, once, with two independent origins", () => {
    expect(combineConfidence([sighting("possible", "a"), sighting("possible", "b")])).toBe("probable");
    expect(combineConfidence([sighting("probable", "a"), sighting("possible", "b")])).toBe("confirme");
    expect(combineConfidence([sighting("possible", "a"), sighting("possible", "b"), sighting("possible", "c")])).toBe(
      "probable",
    );
  });

  it("the same breach seen by two services is one origin", () => {
    expect(combineConfidence([sighting("probable", "Pandabuy"), sighting("probable", "pandabuy")])).toBe("probable");
  });

  it("never raises a namesake", () => {
    expect(combineConfidence([sighting("homonyme", "a"), sighting("homonyme", "b")])).toBe("homonyme");
  });
});

describe("isDetailed", () => {
  it("is true only for confirmed and probable", () => {
    expect(["confirme", "probable", "possible", "homonyme"].map((c) => isDetailed(c as never))).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });
});
