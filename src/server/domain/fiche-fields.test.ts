import { describe, expect, it } from "vitest";
import { FIELD_CODES, FIELD_LABELS } from "./fiche-fields";

describe("FIELD_CODES", () => {
  it("lists the 30 fields of the life record", () => {
    expect(FIELD_CODES).toHaveLength(30);
  });

  it("follows the order of CADRAGE.md, section 5", () => {
    expect(FIELD_CODES[0]).toBe("A1");
    expect(FIELD_CODES.at(-1)).toBe("J1");
    expect(FIELD_CODES.indexOf("H3")).toBe(FIELD_CODES.indexOf("H2") + 1);
  });

  it("has no duplicate", () => {
    expect(new Set(FIELD_CODES).size).toBe(30);
  });
});

describe("FIELD_LABELS", () => {
  it.each(FIELD_CODES)("has a label for %s", (code) => {
    expect(FIELD_LABELS[code].trim()).not.toBe("");
  });

  it("uses the French labels of CADRAGE.md", () => {
    expect(FIELD_LABELS.B2).toBe("Numéros de téléphone");
  });
});
