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
    { url: "https://news.example/a", title: "Jean Dupont gagne la course", content: "Un homonyme sans email ni téléphone" },
    { url: "https://news.example/b", title: "Jean Dupont, boulanger", content: "Encore un homonyme" },
    { url: "https://www.forum.example/u/42", title: "Doublon", content: "jean.dupont@example.com" },
  ],
};

describe("tavily mapper", () => {
  const findings = toFindings([emailBatch, phoneBatch, nameBatch], query);

  it("details only the pages containing the email or the phone, once each", () => {
    const web = findings.filter((f) => f.kind === "web");
    expect(web).toEqual([
      { kind: "web", providerId: "tavily", site: "forum.example", title: "Profil de j•••••••••t@example.com", matchedOn: "email" },
      { kind: "web", providerId: "tavily", site: "club.example", title: "Contact du club", matchedOn: "phone" },
    ]);
  });

  it("counts only the unlinked pages of the name search", () => {
    const count = findings.find((f) => f.kind === "count");
    expect(count).toMatchObject({ kind: "count", count: 2, matchedOn: "name" });
  });

  it("drops unlinked pages of the email search", () => {
    const onlyEmail = toFindings([emailBatch], { email: query.email });
    expect(onlyEmail).toHaveLength(1);
  });
});
