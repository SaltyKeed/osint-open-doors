import { describe, expect, it } from "vitest";
import { followUpSchema } from "./follow-up";

// All values below are invented test data.

describe("followUpSchema", () => {
  it("turns confirmed profile addresses into PROFIL identifiers", () => {
    expect(followUpSchema.parse({ confirmedProfiles: ["HTTPS://Site-A.exemple.ch/lmartin_06/"] })).toEqual({
      confirmedProfiles: [{ type: "PROFIL", value: "https://site-a.exemple.ch/lmartin_06" }],
      searched: [],
    });
  });

  it("gives empty lists when nothing is sent", () => {
    expect(followUpSchema.parse({})).toEqual({ confirmedProfiles: [], searched: [] });
  });

  it("normalizes the identifiers already searched", () => {
    expect(followUpSchema.parse({ searched: [{ type: "EMAIL", value: "Lea@Exemple.ch" }] }).searched).toEqual([
      { type: "EMAIL", value: "lea@exemple.ch" },
    ]);
  });

  it.each<[unknown, string]>([
    [{ confirmedProfiles: ["javascript:alert(1)"] }, "not http or https"],
    [{ confirmedProfiles: Array(61).fill("https://exemple.ch/a") }, "more than 60 profiles"],
    [{ searched: Array(301).fill({ type: "EMAIL", value: "a@exemple.ch" }) }, "more than 300 identifiers"],
    [{ searched: [{ type: "INCONNU", value: "x" }] }, "unknown type"],
    [{ searched: [{ type: "TEL", value: "12345" }] }, "invalid value"],
  ])("rejects %o (%s)", (input) => {
    expect(followUpSchema.safeParse(input).success).toBe(false);
  });

  it("does not echo the visitor's input in the error", () => {
    const result = followUpSchema.safeParse({ searched: [{ type: "TEL", value: "079 999 88" }] });
    expect(JSON.stringify(result.error)).not.toMatch(/999 88/);
  });

  it("does not echo a refused profile address either", () => {
    const result = followUpSchema.safeParse({ confirmedProfiles: ["javascript:secret_visitor_value"] });
    expect(JSON.stringify(result.error)).not.toMatch(/secret_visitor_value/);
  });
});
