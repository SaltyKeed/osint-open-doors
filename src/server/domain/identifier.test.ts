import { describe, expect, it } from "vitest";
import { IDENTIFIER_TYPES, identifierKey, normalizeIdentifier, type IdentifierType } from "./identifier";

// All values below are invented test data.

describe("normalizeIdentifier", () => {
  it.each<[IdentifierType, string, string]>([
    ["EMAIL", " Lea.Martin@Example.CH ", "lea.martin@example.ch"],
    ["TEL", "079 123 45 67", "+41791234567"],
    ["PSEUDO", "@LMartin_06", "lmartin_06"],
    ["NOM", "  Léa   Martin ", "Léa Martin"],
    ["PROFIL", "HTTPS://GitHub.com/lmartin06/", "https://github.com/lmartin06"],
    ["DOMAINE", "WWW.LeaMartin.ch", "leamartin.ch"],
    ["IP", "85.1.2.3", "85.1.2.3"],
    ["ORGA", " CPNE ", "CPNE"],
  ])("normalizes %s %j", (type, raw, value) => {
    expect(normalizeIdentifier(type, raw)).toEqual({ type, value });
  });

  it.each<[IdentifierType, string, string]>([
    ["EMAIL", "pas-un-email", "no @"],
    ["TEL", "+33 6 12 34 56 78", "not a Swiss number"],
    ["PSEUDO", "@", "nothing after @"],
    ["PSEUDO", "jean dupont", "space inside"],
    ["PROFIL", "javascript:alert(1)", "not http or https"],
    ["PROFIL", "pas une adresse", "not a URL"],
    ["DOMAINE", "pas un domaine", "spaces"],
    ["DOMAINE", "localhost", "no dot"],
    ["IP", "999.1.2.3", "octet above 255"],
  ])("rejects %s %j (%s)", (type, raw) => {
    expect(normalizeIdentifier(type, raw)).toBeNull();
  });

  it.each(IDENTIFIER_TYPES)("rejects an empty or blank %s", (type) => {
    expect(normalizeIdentifier(type, "")).toBeNull();
    expect(normalizeIdentifier(type, "   ")).toBeNull();
  });
});

describe("identifierKey", () => {
  it("gives the same key to two spellings of the same email", () => {
    const a = normalizeIdentifier("EMAIL", "Lea.Martin@Example.ch");
    const b = normalizeIdentifier("EMAIL", " lea.martin@example.ch");
    expect(a && identifierKey(a)).toBe("EMAIL:lea.martin@example.ch");
    expect(a && identifierKey(a)).toBe(b && identifierKey(b));
  });

  it("keeps a pseudo and a name with the same text apart", () => {
    expect(identifierKey({ type: "PSEUDO", value: "martin" })).not.toBe(
      identifierKey({ type: "NOM", value: "martin" }),
    );
  });
});
