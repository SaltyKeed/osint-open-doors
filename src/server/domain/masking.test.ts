import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone } from "./masking";

// All values below are invented test data.

describe("maskPhone", () => {
  it("keeps the prefix, the operator code and the last two digits", () => {
    expect(maskPhone("+41791234567")).toBe("+41 79 ••• •• 67");
  });

  it.each([["not a phone"], ["079 123 45 67"], [""]])("hides %s completely if not normalized", (input) => {
    expect(maskPhone(input)).toBe("•••");
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("jean.dupont@example.com")).toBe("j•••@example.com");
  });

  it("uses the same number of dots for a short and a long name", () => {
    expect(maskEmail("a@b.ch")).toBe("a•••@b.ch");
    expect(maskEmail("abcdefghijklmnop@b.ch")).toBe("a•••@b.ch");
  });

  it.each([["invalid"], ["@example.com"], ["jean@"], [""]])("hides %s completely if invalid", (input) => {
    expect(maskEmail(input)).toBe("•••");
  });
});
