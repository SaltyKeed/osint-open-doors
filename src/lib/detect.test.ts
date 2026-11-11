import { describe, expect, it } from "vitest";
import { detect, explainUnknown, looksLikeLoneName, splitEntries, splitName } from "./detect";

describe("detect", () => {
  it("recognizes an email", () => {
    expect(detect("Jean.Dupont@example.com")).toMatchObject({ type: "email", value: "Jean.Dupont@example.com" });
  });

  it("recognizes a Swiss phone number in any common format", () => {
    expect(detect("079 123 45 67")?.type).toBe("phone");
    expect(detect("+41791234567")?.type).toBe("phone");
    expect(detect("0041 79 123 45 67")?.type).toBe("phone");
  });

  it("never takes a string of digits for a username", () => {
    // Without the 0, the number is still valid: it is a phone, not a username.
    expect(detect("791234567")?.type).toBe("phone");
    expect(detect("0791234")).toBeNull();
    expect(explainUnknown("0791234")).toContain("Ce numéro n'est pas reconnu");
  });

  it("recognizes a first and last name, with the city as an alternative", () => {
    expect(detect("Jean Dupont")).toEqual({ type: "name", value: "Jean Dupont", alternatives: ["name", "city"] });
    expect(detect("Anne-Marie de Vries")?.type).toBe("name");
  });

  it("recognizes a username, with the city as an alternative for plain words", () => {
    expect(detect("jdupont_42")).toEqual({ type: "username", value: "jdupont_42", alternatives: ["username"] });
    expect(detect("Neuchatel")).toEqual({ type: "username", value: "Neuchatel", alternatives: ["username", "city"] });
  });

  it("flags a single capitalized word that may be a lone last name", () => {
    expect(looksLikeLoneName(detect("Dupont")!)).toBe(true);
    expect(looksLikeLoneName(detect("jdupont")!)).toBe(false);
  });

  it("recognizes a city with accents and a birth year", () => {
    expect(detect("Neuchâtel")?.type).toBe("city");
    expect(detect("2008")?.type).toBe("birthYear");
  });

  it("returns null for empty or unknown input", () => {
    expect(detect("   ")).toBeNull();
    expect(detect("12")).toBeNull();
  });
});

describe("splitName", () => {
  it("takes the first word as first name by default", () => {
    expect(splitName("Jean Pierre Dupont")).toEqual({ firstName: "Jean", lastName: "Pierre Dupont" });
  });

  it("can take several words as first name, or the reverse order", () => {
    expect(splitName("Jean Pierre Dupont", { firstNameWords: 2, lastFirst: false })).toEqual({
      firstName: "Jean Pierre",
      lastName: "Dupont",
    });
    expect(splitName("Dupont Jean", { firstNameWords: 1, lastFirst: true })).toEqual({ firstName: "Jean", lastName: "Dupont" });
  });
});

describe("splitEntries", () => {
  it("splits a pasted list on commas, semicolons and new lines", () => {
    expect(splitEntries("jean@example.com, 079 123 45 67;Jean Dupont\njdupont")).toEqual([
      "jean@example.com",
      "079 123 45 67",
      "Jean Dupont",
      "jdupont",
    ]);
  });
});
