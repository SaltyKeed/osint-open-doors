import { describe, expect, it } from "vitest";
import { ABNORMAL_SITE_COUNT, isRarePseudo } from "./rare-pseudo";

const common = new Set(["nicolas", "dragon", "sunshine", "schmetterling", "lea"]);

describe("isRarePseudo", () => {
  it("accepts pseudos that are not a common word", () => {
    for (const p of ["lmartin06", "zorvak_ch", "leamartin"]) expect(isRarePseudo(p, { common })).toBe(true);
  });

  it("refuses short pseudos (separators do not count)", () => {
    for (const p of ["lea06", "x_y_z"]) expect(isRarePseudo(p, { common })).toBe(false);
  });

  it("refuses a first name or a common word alone, with or without digits", () => {
    for (const p of ["nicolas", "nicolas2008", "dragon92", "Sunshine", "schmetterling"]) {
      expect(isRarePseudo(p, { common })).toBe(false);
    }
  });

  it("refuses digits only", () => {
    expect(isRarePseudo("123456", { common })).toBe(false);
  });

  it("refuses a pseudo found on an abnormal number of sites", () => {
    expect(isRarePseudo("lmartin06", { common, sitesFound: ABNORMAL_SITE_COUNT + 1 })).toBe(false);
    expect(isRarePseudo("lmartin06", { common, sitesFound: ABNORMAL_SITE_COUNT })).toBe(true);
  });
});
