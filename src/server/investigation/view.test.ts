import { describe, expect, it } from "vitest";
import type { Confidence } from "@/server/domain/confidence";
import { addSighting, type Fiche } from "@/server/domain/fiche";
import { normalizeIdentifier } from "@/server/domain/identifier";
import { extendPath, startPath } from "@/server/domain/path";
import { toView } from "./view";

// All values below are invented test data.
const email = normalizeIdentifier("EMAIL", "lea@example.ch")!;
const pseudo = normalizeIdentifier("PSEUDO", "lmartin06")!;
const path = extendPath(startPath(email), "github", pseudo);
const sighting = (confidence: Confidence) => ({ sourceId: "github", origin: "GitHub", evidence: null, confidence, path });

function fiche(): Fiche {
  const f: Fiche = new Map();
  addSighting(f, { field: "B1", value: "lea@example.ch" }, sighting("confirme"));
  addSighting(f, { field: "C1", value: "Neuchâtel" }, sighting("probable"));
  addSighting(f, { field: "C1", value: "Bern" }, sighting("possible"));
  addSighting(f, { field: "A1", value: "Paul Martin" }, sighting("homonyme"));
  return f;
}

describe("toView", () => {
  const view = toView({ fiche: fiche(), runs: [{ sourceId: "github", identifierType: "EMAIL", status: "found", records: 1 }] }, [
    { id: "github", label: "GitHub" },
    { id: "gravatar", label: "Gravatar" },
  ]);

  it("lists all categories in order with their fill rate", () => {
    expect(view.categories.map((c) => c.code)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
    expect(view.categories.find((c) => c.code === "C")).toMatchObject({ label: "Lieux", filled: 1, total: 3 });
  });

  it("sends confirmed and probable values, masked and in clear, with source and path", () => {
    const city = view.categories.find((c) => c.code === "C")?.fields[0];
    expect(city?.values).toEqual([
      {
        value: "Neuchâtel",
        masked: "N•••",
        confidence: "probable",
        sources: ["GitHub"],
        path: ["saisie (email)", "GitHub (pseudo)"],
        attributes: [],
        thirdParty: false,
      },
    ]);
  });

  it("never sends possible values or namesakes, only their number", () => {
    const text = JSON.stringify(view);
    expect(text).not.toContain("Bern");
    expect(text).not.toContain("Paul Martin");
    expect(view.categories.find((c) => c.code === "C")?.fields[0]?.hiddenCount).toBe(1);
    expect(view.categories.find((c) => c.code === "A")?.fields[0]).toMatchObject({ code: "A1", values: [], hiddenCount: 1 });
  });

  it("lists the services that received the visitor's data", () => {
    expect(view.services).toEqual(["GitHub"]);
  });

  it("tells what each source answered, so that nothing found is not mistaken for a failure", () => {
    const report = toView(
      {
        fiche: fiche(),
        runs: [
          { sourceId: "github", identifierType: "EMAIL", status: "found", records: 2 },
          { sourceId: "github", identifierType: "PSEUDO", status: "error", records: 0 },
          { sourceId: "gravatar", identifierType: "EMAIL", status: "not_found", records: 0 },
          { sourceId: "hudsonrock", identifierType: "EMAIL", status: "quota", records: 0 },
        ],
      },
      [
        { id: "github", label: "GitHub" },
        { id: "gravatar", label: "Gravatar" },
        { id: "hudsonrock", label: "Hudson Rock" },
        { id: "steam", label: "Steam" },
      ],
    ).sourceReport;
    expect(report).toEqual([
      { label: "GitHub", status: "found", records: 2, problems: 1 },
      { label: "Gravatar", status: "not_found", records: 0, problems: 0 },
      { label: "Hudson Rock", status: "quota", records: 0, problems: 1 },
      { label: "Steam", status: "not_asked", records: 0, problems: 0 },
    ]);
  });
});

describe("toView, lists of the result screen", () => {
  const at = (field: Parameters<typeof addSighting>[1]["field"], value: string, attributes: { label: string; value: string }[] = []) => ({
    field,
    value,
    attributes: attributes.map((a) => ({ ...a, known: true })),
  });

  function rich(): Fiche {
    const f: Fiche = new Map();
    const s = sighting("confirme");
    addSighting(f, at("H1", "OldForum", [{ label: "Date de la fuite", value: "01.01.2015" }, { label: "Données exposées", value: "adresses email, noms" }]), s);
    addSighting(
      f,
      at("H1", "Duolingo", [
        { label: "Date de la fuite", value: "24.01.2023" },
        { label: "Comptes touchés", value: "2 676 696" },
        { label: "Données exposées", value: "adresses email, mots de passe" },
        { label: "Description (anglais)", value: "Scraped data." },
        { label: "Logo", value: "https://logos.example/Duolingo.png" },
      ]),
      s,
    );
    addSighting(f, at("H5", "Ordinateur infecté le 02.04.2025 (Windows 11)", [{ label: "Identifiants volés", value: "12" }]), s);
    addSighting(f, at("I1", "Membres du club", [{ label: "Adresse", value: "https://club.example/membres" }, { label: "Extrait", value: "Léa, capitaine" }]), s);
    addSighting(f, at("F2", "https://instagram.com/lmartin06", [{ label: "Service", value: "Instagram" }]), s);
    addSighting(f, at("I2", "instagram.com/lmartin06", [{ label: "Première capture", value: "12.03.2019" }, { label: "Archive", value: "https://web.archive.org/web/2019/x" }]), s);
    addSighting(f, at("C1", "Bern"), sighting("possible"));
    return f;
  }

  const view = toView({ fiche: rich(), runs: [] }, [{ id: "github", label: "GitHub" }]);

  it("breaches: password breaches first, with date, accounts, data, description and logo", () => {
    expect(view.breaches.map((b) => b.name)).toEqual(["Duolingo", "OldForum"]);
    expect(view.breaches[0]).toMatchObject({
      date: "24.01.2023",
      accounts: "2 676 696",
      data: ["adresses email", "mots de passe"],
      passwordExposed: true,
      description: "Scraped data.",
      logo: "https://logos.example/Duolingo.png",
      sources: ["GitHub"],
    });
  });

  it("infections, pages, profiles and archives each have their list", () => {
    expect(view.infections[0]).toMatchObject({ label: "Ordinateur infecté le 02.04.2025 (Windows 11)" });
    expect(view.pages[0]).toMatchObject({ title: "Membres du club", url: "https://club.example/membres", site: "club.example", excerpt: "Léa, capitaine", confidence: "confirme" });
    expect(view.profiles[0]).toMatchObject({ platform: "Instagram", url: "https://instagram.com/lmartin06" });
    expect(view.archives[0]).toMatchObject({ target: "instagram.com/lmartin06", link: "https://web.archive.org/web/2019/x" });
  });

  it("counts what is linked to the person, without the possible values", () => {
    expect(view.summary).toEqual({ linked: 6, breaches: 2, passwordBreaches: 1, infections: 1, pages: 1, profiles: 1, archives: 1, unconfirmed: 1 });
  });

  it("builds the action plan from fixed rules, the most urgent first", () => {
    expect(view.actions.map((a) => a.id)).toEqual(["infection", "passwords", "two-factor", "profiles", "pages", "archives"]);
  });
});
