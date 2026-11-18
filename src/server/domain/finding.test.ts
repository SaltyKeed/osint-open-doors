import { describe, expect, it } from "vitest";
import { mergeFindings, type Finding } from "./finding";
import type { Identifier } from "./identifier";
import type { BreachDetails } from "./source";

// All values below are invented test data.

const email: Identifier = { type: "EMAIL", value: "lea.martin@example.ch" };
const phone: Identifier = { type: "TEL", value: "+41791234567" };
const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };

function finding(overrides: Partial<Finding>): Finding {
  return { field: "C1", value: "Neuchâtel", sources: ["a"], confidence: "confirmed", path: [email], ...overrides };
}

describe("mergeFindings", () => {
  it("merges two writings of the same phone number", () => {
    const merged = mergeFindings([
      finding({ field: "B2", value: "079 123 45 67", sources: ["a"] }),
      finding({ field: "B2", value: "+41791234567", sources: ["b"] }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.sources).toEqual(["a", "b"]);
    expect(merged[0]?.value).toBe("079 123 45 67");
  });

  it("merges emails that differ only by case", () => {
    const merged = mergeFindings([
      finding({ field: "B1", value: "Lea@Example.ch" }),
      finding({ field: "B1", value: "lea@example.ch" }),
    ]);
    expect(merged).toHaveLength(1);
  });

  it("keeps the same value in two different fields apart", () => {
    const merged = mergeFindings([finding({ field: "C1" }), finding({ field: "C2" })]);
    expect(merged).toHaveLength(2);
  });

  it("keeps contradictory values", () => {
    const merged = mergeFindings([finding({ value: "Neuchâtel" }), finding({ value: "Lausanne" })]);
    expect(merged.map((f) => f.value)).toEqual(["Neuchâtel", "Lausanne"]);
  });

  it("keeps the highest confidence", () => {
    const merged = mergeFindings([finding({ confidence: "possible" }), finding({ confidence: "probable" })]);
    expect(merged[0]?.confidence).toBe("probable");
  });

  it("keeps the shortest path", () => {
    const merged = mergeFindings([finding({ path: [email, phone, pseudo] }), finding({ path: [email] })]);
    expect(merged[0]?.path).toEqual([email]);
  });

  it("lists a source once", () => {
    const merged = mergeFindings([finding({ sources: ["a"] }), finding({ sources: ["a"] })]);
    expect(merged[0]?.sources).toEqual(["a"]);
  });

  it("returns an empty list for an empty list", () => {
    expect(mergeFindings([])).toEqual([]);
  });

  describe("breach details", () => {
    const breach = (details: Partial<BreachDetails>): Finding =>
      finding({
        field: "H1",
        value: "ExampleShop",
        breach: { domain: null, year: null, dataTypes: [], records: null, verified: false, ...details },
      });

    it("joins the data types of both sources, each once", () => {
      const merged = mergeFindings([breach({ dataTypes: ["email", "password"] }), breach({ dataTypes: ["password", "phone"] })]);
      expect(merged[0]?.breach?.dataTypes).toEqual(["email", "password", "phone"]);
    });

    it("keeps the first known domain, year and record count", () => {
      const merged = mergeFindings([
        breach({ domain: null, year: null, records: 1200 }),
        breach({ domain: "exampleshop.test", year: 2019, records: 900 }),
      ]);
      expect(merged[0]?.breach).toMatchObject({ domain: "exampleshop.test", year: 2019, records: 1200 });
    });

    it("is verified when one source says so", () => {
      const merged = mergeFindings([breach({ verified: false }), breach({ verified: true })]);
      expect(merged[0]?.breach?.verified).toBe(true);
    });

    it("keeps the details when only the second source has them", () => {
      const merged = mergeFindings([finding({ field: "H1", value: "ExampleShop" }), breach({ year: 2019 })]);
      expect(merged[0]?.breach?.year).toBe(2019);
    });
  });

  it("keeps the infection details of the first source that has them", () => {
    const infection = { date: "2026-03-14", operatingSystem: "Windows 11 Home", stolenCredentials: 87 };
    const merged = mergeFindings([
      finding({ field: "H5", value: "2026-03-14" }),
      finding({ field: "H5", value: "2026-03-14", infection }),
    ]);
    expect(merged[0]?.infection).toEqual(infection);
  });

  it("does not modify the findings it receives", () => {
    const first = finding({ sources: ["a"] });
    mergeFindings([first, finding({ sources: ["b"] })]);
    expect(first.sources).toEqual(["a"]);
  });
});
