import { describe, expect, it } from "vitest";
import { normalizeIdentifier, type IdentifierType } from "@/server/domain/identifier";
import { toWebRecords } from "./mapper";
import { profileFromUrl } from "./profiles";
import { planQueries } from "./queries";
import { tavilyResponseSchema } from "./schema";

// All values below are invented test data.
const id = (type: IdentifierType, raw: string) => normalizeIdentifier(type, raw)!;

describe("planQueries", () => {
  it("searches the exact email, once", () => {
    expect(planQueries(id("EMAIL", "lea@example.ch")).map((q) => q.query)).toEqual(['"lea@example.ch"']);
  });

  it("searches every common format of a phone number in one query", () => {
    const [query] = planQueries(id("TEL", "079 123 45 67"));
    for (const format of ['"+41791234567"', '"0791234567"', '"079 123 45 67"', '"+41 79 123 45 67"']) {
      expect(query?.query).toContain(format);
    }
  });

  it("searches a pseudo on the whole web and on profile sites", () => {
    const queries = planQueries(id("PSEUDO", "lmartin06"));
    expect(queries).toHaveLength(2);
    expect(queries[1]?.includeDomains).toContain("instagram.com");
  });

  it("searches a name on the web, social networks, Swiss press and sport", () => {
    const queries = planQueries(id("NOM", "Léa Martin"));
    expect(queries.map((q) => q.query)).toEqual(Array(4).fill('"Léa Martin"'));
    expect(queries[2]?.includeDomains).toContain("arcinfo.ch");
  });

  it("does not search profiles, domains, IP or organisations", () => {
    expect(planQueries(id("PROFIL", "https://github.com/lmartin06"))).toEqual([]);
  });
});

describe("profileFromUrl", () => {
  it("recognises profile pages and their pseudo", () => {
    expect(profileFromUrl("https://www.instagram.com/lmartin06/")).toEqual({
      platform: "Instagram",
      url: "https://instagram.com/lmartin06",
      pseudo: "lmartin06",
    });
    expect(profileFromUrl("https://www.tiktok.com/@lea.martin")?.pseudo).toBe("lea.martin");
    expect(profileFromUrl("https://ch.linkedin.com/in/lea-martin-123")?.platform).toBe("LinkedIn");
    expect(profileFromUrl("https://www.reddit.com/user/lmartin06")?.pseudo).toBe("lmartin06");
  });

  it("ignores pages that are not a profile", () => {
    for (const url of [
      "https://www.instagram.com/p/Cx12ab/",
      "https://x.com/lmartin06/status/123",
      "https://www.youtube.com/watch?v=abc",
      "https://www.arcinfo.ch/sport/volley",
      "https://www.instagram.com/explore",
    ]) {
      expect(profileFromUrl(url)).toBeNull();
    }
  });
});

describe("toWebRecords", () => {
  const body = tavilyResponseSchema.parse({
    results: [
      {
        url: "https://www.instagram.com/lmartin06/",
        title: "Léa (@lmartin06) • Instagram",
        content: "Volley à Neuchâtel. Contact : lea@example.ch",
        raw_content: "full page text with lea@example.ch",
      },
      {
        url: "https://club.example/membres",
        title: "Membres du club",
        content: "Liste des membres et contacts",
        raw_content: "Léa Martin — LEA@EXAMPLE.CH — capitaine",
      },
      { url: "https://other.example/page", title: "Sans rapport", content: "Rien ici", raw_content: "rien" },
    ],
  });
  const email = id("EMAIL", "lea@example.ch");
  const records = toWebRecords(body, email);

  it("keeps only pages that really contain the searched value", () => {
    // A profile page has the account as origin (one proof with the other sources that check it).
    expect(records.map((r) => r.origin)).toEqual(["https://instagram.com/lmartin06", "club.example"]);
  });

  it("each page is an I1 value with its address and excerpt, never the full page text", () => {
    expect(records[1]?.values[0]).toEqual({
      field: "I1",
      value: "Membres du club",
      attributes: [
        { label: "Adresse", value: "https://club.example/membres", known: true },
        { label: "Extrait", value: "Liste des membres et contacts", known: true },
      ],
    });
    expect(JSON.stringify(records)).not.toContain("capitaine");
  });

  it("a profile page adds an account (F2) and pivots on profile and pseudo", () => {
    const first = records[0]!;
    expect(first.values.map((v) => `${v.field}=${v.value}`)).toContain("F2=https://instagram.com/lmartin06");
    expect(first.identifiers.map((i) => `${i.identifier.type}:${i.identifier.value}`)).toEqual([
      "EMAIL:lea@example.ch",
      "PROFIL:https://instagram.com/lmartin06",
      "PSEUDO:lmartin06",
    ]);
  });

  it("a page found by a name does not hold the name as a confirmed identifier", () => {
    const byName = toWebRecords(
      tavilyResponseSchema.parse({
        results: [{ url: "https://press.example/a", title: "Article", content: "Léa Martin a gagné", raw_content: "" }],
      }),
      id("NOM", "Léa Martin"),
    );
    expect(byName[0]?.identifiers).toEqual([]);
  });

  it("a phone is recognised in any format", () => {
    const byPhone = toWebRecords(
      tavilyResponseSchema.parse({
        results: [{ url: "https://tel.example/x", title: "Qui appelle ?", content: "Le 079 123 45 67 appelle souvent", raw_content: "" }],
      }),
      id("TEL", "+41791234567"),
    );
    expect(byPhone).toHaveLength(1);
  });
});
