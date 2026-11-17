import { describe, expect, it } from "vitest";
import { CATEGORIES, FIELDS, fieldCodeSchema } from "./fiche-fields";

describe("fiche fields", () => {
  it("has the 10 categories and 30 fields of CADRAGE.md, section 5, in order", () => {
    expect(CATEGORIES.map((c) => c.code)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
    expect(FIELDS).toHaveLength(30);
    expect(FIELDS[0]?.code).toBe("A1");
    expect(FIELDS.at(-1)?.code).toBe("J1");
  });

  it("puts every field in an existing category, without duplicate codes", () => {
    const categories = new Set(CATEGORIES.map((c) => c.code));
    expect(FIELDS.every((f) => categories.has(f.category) && f.code.startsWith(f.category))).toBe(true);
    expect(new Set(FIELDS.map((f) => f.code)).size).toBe(FIELDS.length);
  });

  it("validates field codes", () => {
    expect(fieldCodeSchema.safeParse("H3").success).toBe(true);
    expect(fieldCodeSchema.safeParse("H9").success).toBe(false);
    expect(fieldCodeSchema.safeParse("h3").success).toBe(false);
  });
});
