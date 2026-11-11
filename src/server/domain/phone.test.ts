import { describe, expect, it } from "vitest";
import { nationalDigits, normalizePhone, phoneSearchVariants } from "./phone";

describe("normalizePhone", () => {
  it("normalizes Swiss formats to E.164", () => {
    expect(normalizePhone("079 123 45 67")).toBe("+41791234567");
    expect(normalizePhone("+41 79 123 45 67")).toBe("+41791234567");
    expect(normalizePhone("0041791234567")).toBe("+41791234567");
  });

  it("rejects invalid numbers", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("hello")).toBeNull();
  });
});

describe("phoneSearchVariants", () => {
  it("lists the usual ways to write a Swiss number", () => {
    expect(phoneSearchVariants("+41791234567")).toEqual([
      "+41 79 123 45 67",
      "079 123 45 67",
      "0791234567",
      "+41791234567",
    ]);
  });
});

describe("nationalDigits", () => {
  it("returns the digits without country code or leading zero", () => {
    expect(nationalDigits("+41791234567")).toBe("791234567");
  });
});
