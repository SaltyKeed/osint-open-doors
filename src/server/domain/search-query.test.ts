import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizePseudo, normalizeSwissPhone, queryIdentifiers, searchRequestSchema } from "./search-query";

// All values below are invented test data.

describe("normalizeEmail", () => {
  it("trims spaces and lowercases", () => {
    expect(normalizeEmail("  Jean.Dupont@Example.COM ")).toBe("jean.dupont@example.com");
  });
});

describe("normalizePseudo", () => {
  it("trims spaces, removes a leading @ and lowercases", () => {
    expect(normalizePseudo("  @LMartin_06 ")).toBe("lmartin_06");
  });

  it("accepts dots and dashes around letters and digits, up to 40 characters", () => {
    expect(normalizePseudo("l.martin-06")).toBe("l.martin-06");
    expect(normalizePseudo("a".repeat(40))).toBe("a".repeat(40));
  });

  it.each([
    ["@", "nothing after @"],
    ["   ", "blank"],
    ["l martin", "space inside"],
    ["jean@exemple.ch", "an email"],
    ["@@lmartin", "a second @"],
    ["..", "only dots: the site URL would point to the parent page"],
    ["l&martin", "character outside letters, digits, dot, dash, underscore"],
    ["a".repeat(41), "longer than 40 characters"],
  ])("rejects %s (%s)", (input) => {
    expect(normalizePseudo(input)).toBeNull();
  });
});

describe("normalizeSwissPhone", () => {
  it.each([
    ["079 123 45 67"],
    ["0791234567"],
    ["+41 79 123 45 67"],
    ["+41791234567"],
    ["0041 79 123 45 67"],
    ["079.123.45.67"],
    ["079-123-45-67"],
    ["(079) 123 45 67"],
  ])("normalizes %s to +41791234567", (input) => {
    expect(normalizeSwissPhone(input)).toBe("+41791234567");
  });

  it.each([
    ["+33 6 12 34 56 78", "French number"],
    ["12345", "too short"],
    ["079 123 45 678", "too long"],
    ["079 123 45 6a", "contains a letter"],
    ["", "empty"],
  ])("rejects %s (%s)", (input) => {
    expect(normalizeSwissPhone(input)).toBeNull();
  });
});

describe("searchRequestSchema", () => {
  it("normalizes the email", () => {
    expect(searchRequestSchema.parse({ email: "Jean@Exemple.ch", consent: true })).toEqual({
      email: "jean@exemple.ch",
    });
  });

  it("normalizes the phone", () => {
    expect(searchRequestSchema.parse({ phone: "079 123 45 67", consent: true })).toEqual({
      phone: "+41791234567",
    });
  });

  it("trims first and last name and groups them", () => {
    expect(
      searchRequestSchema.parse({ firstName: " Jean ", lastName: "Dupont", consent: true }),
    ).toEqual({ name: { first: "Jean", last: "Dupont" } });
  });

  it("collapses repeated spaces in the name, like normalizeIdentifier", () => {
    expect(
      searchRequestSchema.parse({ firstName: "Jean  Pierre", lastName: "Du   Pont", consent: true }),
    ).toEqual({ name: { first: "Jean Pierre", last: "Du Pont" } });
  });

  it("normalizes the pseudo", () => {
    expect(searchRequestSchema.parse({ pseudo: "@LMartin_06", consent: true })).toEqual({ pseudo: "lmartin_06" });
  });

  it("keeps every identifier given", () => {
    expect(
      searchRequestSchema.parse({
        email: "jean@exemple.ch",
        phone: "+41 79 123 45 67",
        pseudo: "jdupont_74",
        firstName: "Jean",
        lastName: "Dupont",
        consent: true,
      }),
    ).toEqual({
      email: "jean@exemple.ch",
      phone: "+41791234567",
      pseudo: "jdupont_74",
      name: { first: "Jean", last: "Dupont" },
    });
  });

  // unknown: each row is a different shape, like a request body before parsing.
  it.each<[unknown, string]>([
    [{ email: "jean@exemple.ch", consent: false }, "consent refused"],
    [{ email: "jean@exemple.ch" }, "consent missing"],
    [{ email: "jean@exemple.ch", consent: "true" }, "consent is a string"],
    [{ consent: true }, "no identifier"],
    [{ firstName: "Jean", consent: true }, "first name without last name"],
    [{ lastName: "Dupont", consent: true }, "last name without first name"],
    [{ firstName: "   ", lastName: "Dupont", consent: true }, "blank first name"],
    [{ phone: "12345", consent: true }, "invalid phone"],
    [{ email: "pas-un-email", consent: true }, "invalid email"],
    [{ pseudo: "@", consent: true }, "pseudo is only @"],
    [{ pseudo: "jean dupont", consent: true }, "pseudo with a space"],
  ])("rejects %o (%s)", (input) => {
    expect(searchRequestSchema.safeParse(input).success).toBe(false);
  });

  it("does not echo the visitor's input in the error", () => {
    const result = searchRequestSchema.safeParse({
      phone: "079 999 88",
      email: "secret-visitor@exemple",
      pseudo: "secret pseudo",
      consent: true,
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).not.toMatch(/999 88|secret-visitor|secret pseudo/);
  });
});

describe("queryIdentifiers", () => {
  it("turns each part of the query into an identifier, in a fixed order", () => {
    expect(
      queryIdentifiers({
        name: { first: "Léa", last: "Martin" },
        pseudo: "lmartin_06",
        phone: "+41791234567",
        email: "lea@exemple.ch",
      }),
    ).toEqual([
      { type: "EMAIL", value: "lea@exemple.ch" },
      { type: "TEL", value: "+41791234567" },
      { type: "PSEUDO", value: "lmartin_06" },
      { type: "NOM", value: "Léa Martin" },
    ]);
  });

  it("leaves out what the visitor did not give", () => {
    expect(queryIdentifiers({ email: "lea@exemple.ch" })).toEqual([{ type: "EMAIL", value: "lea@exemple.ch" }]);
  });
});
