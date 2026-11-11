import { describe, expect, it } from "vitest";
import { maskEmail, maskInText, maskName, maskPhone } from "./masking";

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

describe("maskPhone", () => {
  it("keeps the country code, the prefix and the last two digits", () => {
    expect(maskPhone("+41791234567")).toBe("+41 79 ••• •• 67");
  });
});

describe("maskName", () => {
  it("keeps only the first letter of each part", () => {
    expect(maskName("Jean", "Dupont")).toBe("J••• D•••••");
  });
});

describe("maskInText", () => {
  it("masks the visitor's email and phone wherever they appear", () => {
    const text = "Contact: Jean.Dupont@example.com or 079 123 45 67";
    expect(maskInText(text, { email: "jean.dupont@example.com", phone: "+41791234567" })).toBe(
      "Contact: j•••••••••t@example.com or +41 79 ••• •• 67",
    );
  });
});
