import { describe, expect, it } from "vitest";
import { maskEmail } from "./masking";

describe("maskEmail", () => {
  it("keeps the first and last character of the local part and the domain", () => {
    expect(maskEmail("jean.dupont@example.com")).toBe("j•••••••••t@example.com");
  });

  it("masks short local parts completely after the first character", () => {
    expect(maskEmail("ab@example.com")).toBe("a•@example.com");
    expect(maskEmail("a@example.com")).toBe("a@example.com");
  });

  it("returns a fully masked value when the input is not an email", () => {
    expect(maskEmail("not-an-email")).toBe("•••");
  });
});
