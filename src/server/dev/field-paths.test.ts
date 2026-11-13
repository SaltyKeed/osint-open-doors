import { describe, expect, it } from "vitest";
import { fieldPaths, ignoredFields } from "./field-paths";

describe("fieldPaths", () => {
  it("lists the leaf fields, with [] for array items", () => {
    expect(fieldPaths({ a: 1, b: { c: "x", d: [{ e: true }, { e: false, f: null }] }, g: [] })).toEqual([
      "a",
      "b.c",
      "b.d[].e",
      "b.d[].f",
      "g",
    ]);
  });

  it("returns nothing for null", () => {
    expect(fieldPaths(null)).toEqual([]);
  });
});

describe("ignoredFields", () => {
  it("lists the raw fields that the schema dropped", () => {
    const raw = { list: [{ name: "ExampleShop", logo: "x.png" }], meta: { risk: 3 } };
    const parsed = { list: [{ name: "ExampleShop" }] };
    expect(ignoredFields(raw, parsed)).toEqual(["list[].logo", "meta.risk"]);
  });
});
