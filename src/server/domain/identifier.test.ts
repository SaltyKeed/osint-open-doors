import { describe, expect, it } from "vitest";
import { identifierKey, normalizeIdentifier } from "./identifier";

const value = (type: Parameters<typeof normalizeIdentifier>[0], raw: string) =>
  normalizeIdentifier(type, raw)?.value ?? null;

describe("normalizeIdentifier", () => {
  it("EMAIL: trimmed, lowercase, valid format", () => {
    expect(value("EMAIL", " Lea.Martin@Example.CH ")).toBe("lea.martin@example.ch");
    expect(value("EMAIL", "lea@")).toBeNull();
  });

  it("TEL: every Swiss format gives the same E.164 number; foreign numbers too", () => {
    for (const raw of ["079 123 45 67", "+41 79 123 45 67", "0041791234567"]) {
      expect(value("TEL", raw)).toBe("+41791234567");
    }
    expect(value("TEL", "+33 6 12 34 56 78")).toBe("+33612345678");
    expect(value("TEL", "123")).toBeNull();
  });

  it("PSEUDO: no leading @, lowercase, no space", () => {
    expect(value("PSEUDO", "@LMartin_06")).toBe("lmartin_06");
    expect(value("PSEUDO", "lea martin")).toBeNull();
  });

  it("NOM: keeps case and accents; the key ignores them and the word order", () => {
    expect(value("NOM", "  Léa   Martin ")).toBe("Léa Martin");
    const a = normalizeIdentifier("NOM", "Léa Martin");
    const b = normalizeIdentifier("NOM", "MARTIN Lea");
    expect(a && b && identifierKey(a) === identifierKey(b)).toBe(true);
  });

  it("PROFIL: https, host without www, no query, hash or trailing slash", () => {
    expect(value("PROFIL", "http://www.GitHub.com/lmartin06/?tab=repos#top")).toBe(
      "https://github.com/lmartin06",
    );
    expect(value("PROFIL", "javascript:alert(1)")).toBeNull();
  });

  it("DOMAINE: lowercase, no www nor final dot, at least one dot", () => {
    expect(value("DOMAINE", "WWW.LeaMartin.ch.")).toBe("leamartin.ch");
    expect(value("DOMAINE", "https://leamartin.ch/blog")).toBe("leamartin.ch");
    expect(value("DOMAINE", "localhost")).toBeNull();
  });

  it("IP: valid IPv4 or IPv6", () => {
    expect(value("IP", "85.1.2.3")).toBe("85.1.2.3");
    expect(value("IP", "999.1.2.3")).toBeNull();
  });

  it("ORGA: the key ignores case and accents", () => {
    const a = normalizeIdentifier("ORGA", "CPNE");
    const b = normalizeIdentifier("ORGA", "cpne");
    expect(a && b && identifierKey(a) === identifierKey(b)).toBe(true);
  });
});

describe("identifierKey", () => {
  it("includes the type", () => {
    const email = normalizeIdentifier("EMAIL", "lea@example.ch");
    const pseudo = normalizeIdentifier("PSEUDO", "lea@example.ch");
    expect(email && identifierKey(email)).toBe("EMAIL:lea@example.ch");
    expect(email && pseudo && identifierKey(email) !== identifierKey(pseudo)).toBe(true);
  });
});
