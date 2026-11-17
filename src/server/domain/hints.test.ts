import { describe, expect, it } from "vitest";
import { countHints, emptyReference } from "./hints";

const reference = {
  ...emptyReference(),
  nameKeys: new Set(["lea martin"]),
  cities: new Set(["neuchatel"]),
  birthYear: 2008,
  photoUrls: new Set(["https://img.example/lea.png"]),
};

describe("countHints", () => {
  it("compares cities without case or accents", () => {
    expect(countHints({ cities: ["Neuchâtel"] }, reference)).toBe(1);
  });

  it("counts name, city and birth year together", () => {
    expect(countHints({ names: ["Martin Léa"], cities: ["neuchatel"], birthYear: 2008 }, reference)).toBe(3);
  });

  it("a different birth year cancels the other hints", () => {
    expect(countHints({ names: ["Léa Martin"], birthYear: 1990 }, reference)).toBe(0);
  });

  it("only the same photo address counts: no face recognition", () => {
    expect(countHints({ photoUrls: ["https://img.example/lea.png"] }, reference)).toBe(1);
    expect(countHints({ photoUrls: ["https://img.example/other.png"] }, reference)).toBe(0);
  });
});
