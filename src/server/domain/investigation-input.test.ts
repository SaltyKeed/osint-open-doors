import { describe, expect, it } from "vitest";
import { investigationInputSchema, toInitialLeads } from "./investigation-input";

const parse = (body: unknown) => investigationInputSchema.safeParse(body);

describe("investigationInputSchema", () => {
  it("email alone gives one confirmed EMAIL lead from the input", () => {
    const result = parse({ email: " Lea@Example.ch ", consent: true });
    expect(result.success).toBe(true);
    const { leads } = toInitialLeads(result.data!);
    expect(leads).toHaveLength(1);
    expect(leads[0]?.identifier).toEqual({ type: "EMAIL", value: "lea@example.ch" });
    expect(leads[0]?.path[0]?.sourceId).toBe("saisie");
  });

  it("first and last name give one NOM; the context is kept apart", () => {
    const result = parse({
      email: "lea@example.ch",
      phone: "079 123 45 67",
      pseudo: "lmartin06",
      firstName: "Léa",
      lastName: "Martin",
      locality: "Neuchâtel",
      birthDate: "2008-03-14",
      consent: true,
    });
    const { leads, context } = toInitialLeads(result.data!);
    expect(leads.map((l) => l.identifier.type)).toEqual(["EMAIL", "TEL", "PSEUDO", "NOM"]);
    expect(context).toEqual({ locality: "Neuchâtel", birthYear: 2008 });
  });

  it("refuses a first name without last name", () => {
    expect(parse({ firstName: "Léa", consent: true }).success).toBe(false);
  });

  it("refuses context alone: at least one identifier", () => {
    expect(parse({ locality: "Neuchâtel", consent: true }).success).toBe(false);
  });

  it("refuses without consent", () => {
    expect(parse({ email: "lea@example.ch" }).success).toBe(false);
    expect(parse({ email: "lea@example.ch", consent: false }).success).toBe(false);
  });

  it("an invalid value is refused without being copied in the error", () => {
    const result = parse({ email: "secret-value@", consent: true });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).not.toContain("secret-value");
  });
});
