import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeSwissPhone, queryKinds, searchRequestSchema } from "./search-query";

// All values below are invented test data.

describe("normalizeEmail", () => {
  it("trims spaces and lowercases", () => {
    expect(normalizeEmail("  Jean.Dupont@Example.COM ")).toBe("jean.dupont@example.com");
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

  it("keeps every identifier given", () => {
    expect(
      searchRequestSchema.parse({
        email: "jean@exemple.ch",
        phone: "+41 79 123 45 67",
        firstName: "Jean",
        lastName: "Dupont",
        consent: true,
      }),
    ).toEqual({
      email: "jean@exemple.ch",
      phone: "+41791234567",
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
  ])("rejects %o (%s)", (input) => {
    expect(searchRequestSchema.safeParse(input).success).toBe(false);
  });

  it("does not echo the visitor's input in the error", () => {
    const result = searchRequestSchema.safeParse({
      phone: "079 999 88",
      email: "secret-visitor@exemple",
      consent: true,
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).not.toMatch(/999 88|secret-visitor/);
  });
});

describe("queryKinds", () => {
  it("lists the kinds present in the query", () => {
    expect(queryKinds({ email: "a@b.ch", name: { first: "A", last: "B" } })).toEqual(["email", "name"]);
  });

  it("lists all three kinds in a fixed order", () => {
    expect(
      queryKinds({ name: { first: "A", last: "B" }, phone: "+41791234567", email: "a@b.ch" }),
    ).toEqual(["email", "phone", "name"]);
  });
});
