import { describe, expect, it } from "vitest";
import { mergeFindings, type Finding } from "./finding";
import type { Identifier } from "./identifier";

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

  it("does not modify the findings it receives", () => {
    const first = finding({ sources: ["a"] });
    mergeFindings([first, finding({ sources: ["b"] })]);
    expect(first.sources).toEqual(["a"]);
  });
});
