import { describe, expect, it } from "vitest";
import type { BreachFinding, Finding } from "@/server/domain/types";
import { catalogSchema, enrichBreaches, indexCatalog, toPlainText } from "./mapper";

// Invented catalog (fixtures never contain real data).
const catalog = catalogSchema.parse([
  {
    Name: "ExempleShop",
    Title: "Exemple Shop",
    Domain: "exempleshop.com",
    BreachDate: "2019-04-01",
    PwnCount: 1200,
    Description: 'En avril 2019, <a href="https://x" rel="noopener">Exemple Shop</a> a subi une fuite &amp; publié les comptes.',
    LogoPath: "https://logos.example/ExempleShop.png",
    DataClasses: ["Email addresses", "Passwords", "Physical addresses", "Purchases"],
    IsVerified: true,
  },
  {
    Name: "FauxForum",
    Title: "Faux Forum",
    Domain: "fauxforum.net",
    BreachDate: "2021-01-01",
    PwnCount: 50,
    DataClasses: ["Email addresses"],
    IsVerified: false,
    IsFabricated: true,
  },
]);

const breach = (source: string, extra: Partial<BreachFinding> = {}): BreachFinding => ({
  kind: "breach",
  providerId: "leakcheck",
  source,
  categories: ["email"],
  matchedOn: "email",
  ...extra,
});

describe("hibp catalog enrichment", () => {
  const index = indexCatalog(catalog);

  it("adds the data types, size, domain and year of a known breach", () => {
    const [result] = enrichBreaches([breach("Exempleshop.com (2019)")], index);
    expect(result).toMatchObject({
      kind: "breach",
      source: "Exempleshop.com (2019)",
      domain: "exempleshop.com",
      year: "2019",
      records: 1200,
      describedBy: "hibp",
    });
    expect(result?.kind === "breach" && result.categories).toEqual(
      expect.arrayContaining(["email", "password", "address", "activity"]),
    );
  });

  it("adds the clean title, a plain-text description and the logo", () => {
    const [result] = enrichBreaches([breach("Exempleshop.com (2019)")], index);
    expect(result).toMatchObject({
      title: "Exemple Shop",
      description: "En avril 2019, Exemple Shop a subi une fuite & publié les comptes.",
      logo: "https://logos.example/ExempleShop.png",
    });
    // No HTML tag survives into what the screen shows.
    expect(result?.kind === "breach" && result.description).not.toContain("<");
  });

  it("keeps the values already given by the source", () => {
    const [result] = enrichBreaches([breach("ExempleShop", { year: "2018", records: 7 })], index);
    expect(result).toMatchObject({ year: "2018", records: 7 });
  });

  it("warns about a breach the catalog marks as fabricated", () => {
    const [result] = enrichBreaches([breach("Faux Forum")], index);
    expect(result?.kind === "breach" && result.notes).toEqual(["Fuite probablement inventée"]);
  });

  it("leaves unknown breaches and other results untouched", () => {
    const other: Finding = { kind: "count", providerId: "x", source: "x", count: 1, label: "x", matchedOn: "name" };
    const unknown = breach("Inconnu");
    expect(enrichBreaches([unknown, other], index)).toEqual([unknown, other]);
  });
});

describe("toPlainText", () => {
  it("removes tags and decodes entities", () => {
    expect(toPlainText('<a href="x">Lien</a> &amp; <em>texte</em>&nbsp;ici')).toBe("Lien & texte ici");
  });
});
