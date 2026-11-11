import { describe, expect, it } from "vitest";
import { toFindings } from "./mapper";

// Invented results (fixtures never contain real data).
const query = { email: "jean.dupont@example.com", phone: "+41791234567", firstName: "Jean", lastName: "Dupont" };

const emailBatch = {
  searchedOn: "email" as const,
  results: [
    { url: "https://www.forum.example/u/42", title: "Profil de jean.dupont@example.com", content: "Membre depuis 2019" },
    { url: "https://spam.example/x", title: "Unrelated page", content: "No email here" },
  ],
};

const phoneBatch = {
  searchedOn: "phone" as const,
  results: [{ url: "https://club.example/contact", title: "Contact du club", content: "Responsable : 079 123 45 67" }],
};

const nameBatch = {
  searchedOn: "name" as const,
  results: [
    { url: "https://news.example/a", title: "Jean Dupont gagne la course", content: "Contact : autre.personne@example.org" },
    { url: "https://cars.example/f", title: "Jean-Claude Ferrari", content: "Rien sur Dupont ici, seulement Jean" },
    { url: "https://www.forum.example/u/42", title: "Doublon", content: "jean.dupont@example.com" },
  ],
};

describe("tavily mapper", () => {
  const findings = toFindings([emailBatch, phoneBatch, nameBatch], query);

  it("marks the pages containing the email or the phone as verified", () => {
    const verified = findings.filter((f) => f.verified);
    expect(verified.map((f) => [f.site, f.matchedOn])).toEqual([
      ["forum.example", "email"],
      ["club.example", "phone"],
    ]);
    expect(verified[0]?.title).toBe("Profil de j•••••••••t@example.com");
    expect(verified[1]?.snippet).toBe("Responsable : +41 79 ••• •• 67");
  });

  it("shows the pages of the name search as not verified, with contacts masked", () => {
    const unverified = findings.filter((f) => !f.verified);
    expect(unverified).toEqual([
      {
        kind: "web",
        providerId: "tavily",
        verified: false,
        site: "news.example",
        url: "https://news.example/a",
        title: "Jean Dupont gagne la course",
        snippet: "Contact : a••••••••••••e@example.org",
        matchedOn: "name",
      },
    ]);
  });

  it("drops name-search pages where first and last name are not together", () => {
    expect(findings.map((f) => f.url)).not.toContain("https://cars.example/f");
  });

  it("drops unlinked pages of the email search and keeps each page once", () => {
    expect(findings.map((f) => f.url)).not.toContain("https://spam.example/x");
    expect(findings.filter((f) => f.url === "https://www.forum.example/u/42")).toHaveLength(1);
  });
});
