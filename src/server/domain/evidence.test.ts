import { describe, expect, it } from "vitest";
import { findingKey } from "./finding";
import { countHints, isCommonPseudo, isLinkedToConfirmed } from "./evidence";
import type { SourceRecord } from "./source";

// All values below are invented test data.

function record(overrides: Partial<SourceRecord>): SourceRecord {
  return { about: "subject", fields: [], identifiers: [], ...overrides };
}

describe("isLinkedToConfirmed", () => {
  const confirmed = new Set(["TEL:+41791234567", "PSEUDO:lmartin_06"]);

  it("is true when the record holds a confirmed phone", () => {
    expect(isLinkedToConfirmed(record({ identifiers: [{ type: "TEL", value: "+41791234567" }] }), confirmed)).toBe(true);
  });

  it("is false when only a confirmed pseudo matches: a pseudo is not unique", () => {
    expect(isLinkedToConfirmed(record({ identifiers: [{ type: "PSEUDO", value: "lmartin_06" }] }), confirmed)).toBe(false);
  });

  it("is false without a confirmed identifier", () => {
    expect(isLinkedToConfirmed(record({ identifiers: [{ type: "TEL", value: "+41790000000" }] }), confirmed)).toBe(false);
  });
});

describe("countHints", () => {
  const confirmed = new Set(["C1:neuchâtel", "A1:léa martin"]);

  it("counts a city equal to a confirmed one, whatever its case", () => {
    expect(countHints(record({ fields: [{ field: "C1", value: "Neuchâtel" }] }), confirmed)).toBe(1);
  });

  it("counts one hint per matching field", () => {
    const fields = [
      { field: "C1" as const, value: "Neuchâtel" },
      { field: "A1" as const, value: "Léa Martin" },
    ];
    expect(countHints(record({ fields }), confirmed)).toBe(2);
  });

  it("counts a displayed name that contains the confirmed name as a whole-word match", () => {
    const keys = new Set([findingKey("A1", "Léa Martin")]);
    const fields = [{ field: "A1" as const, value: "Léa Martin (@lmartin_06) • Instagram" }];
    expect(countHints(record({ fields }), keys)).toBe(1);
  });

  it("still counts a one-word name equal to the confirmed one", () => {
    const keys = new Set([findingKey("A1", "Léa")]);
    expect(countHints(record({ fields: [{ field: "A1", value: "Léa" }] }), keys)).toBe(1);
  });

  it("does not count a name that only starts like the confirmed one", () => {
    const keys = new Set([findingKey("A1", "Léa Martin")]);
    expect(countHints(record({ fields: [{ field: "A1", value: "Léa Martinez" }] }), keys)).toBe(0);
  });

  it("ignores the same value in a field that is not a hint", () => {
    expect(countHints(record({ fields: [{ field: "C2", value: "Neuchâtel" }] }), confirmed)).toBe(0);
  });
});

describe("isCommonPseudo", () => {
  it.each<[number, number | undefined, boolean]>([
    [70, 600, true],
    [30, 600, false],
    [30, undefined, false],
  ])("%i profiles on %s sites: common = %s", (found, sitesChecked, expected) => {
    expect(isCommonPseudo(found, sitesChecked)).toBe(expected);
  });
});
