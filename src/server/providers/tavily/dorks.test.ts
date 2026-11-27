import { describe, expect, it } from "vitest";
import type { DorkContext } from "@/server/domain/source";
import { buildDorks, keepsPage, PRESS_DOMAINS } from "./dorks";

// All values below are invented test data.
const ctx: DorkContext = {
  name: "Léa Martin",
  values: { C1: ["Neuchâtel"], E1: ["Exemple SA", "Développeuse, Exemple SA"] },
  pseudo: { value: "lmartin_06", rare: true },
  onlyValues: false,
};

const dorks = buildDorks(ctx);
const find = (kind: string, field: string) => dorks.find((d) => d.kind === kind && d.field === field)!;

describe("buildDorks", () => {
  it("dork 1: name and confirmed city", () => {
    expect(dorks[0]).toMatchObject({ kind: "value", field: "I1", query: '"Léa Martin" "Neuchâtel"', second: ["Neuchâtel"], romandie: false });
  });

  it("dork 2: name and the shortest employer value", () => {
    expect(dorks[1]).toMatchObject({ kind: "value", field: "E1", query: '"Léa Martin" "Exemple SA"', romandie: false });
  });

  it("dork 3: name and a school or organisation", () => {
    const [dork] = buildDorks({ name: "Léa Martin", values: { ORGA: ["Exemple SA"] }, onlyValues: false });
    expect(dork).toMatchObject({ kind: "value", field: "D1", query: '"Léa Martin" "Exemple SA"' });
  });

  it("dork 4: pseudo on three platforms, without cantons", () => {
    expect(find("pseudo", "F2")).toMatchObject({
      query: '"lmartin_06" site:instagram.com OR site:tiktok.com OR site:facebook.com',
      site: ["instagram.com", "tiktok.com", "facebook.com"],
      romandie: false,
    });
  });

  it("dorks 5 to 8: keywords, in order", () => {
    const keywords = dorks.filter((d) => d.kind === "keyword");
    expect(keywords.map((d) => [d.field, d.query])).toEqual([
      ["F2", '"Léa Martin" site:linkedin.com/in'],
      ["G1", '"Léa Martin" club OR résultats OR classement'],
      ["G3", '"Léa Martin"'],
      ["I3", '"Léa Martin" filetype:pdf'],
    ]);
    expect(keywords[0]!.site).toEqual(["linkedin.com"]);
    expect(keywords[2]!.includeDomains).toEqual(PRESS_DOMAINS);
  });

  it("without a name, only the pseudo dork; without a pseudo either, nothing", () => {
    expect(buildDorks({ ...ctx, name: undefined }).map((d) => d.kind)).toEqual(["pseudo"]);
    expect(buildDorks({ values: {}, onlyValues: false })).toEqual([]);
  });

  it("second round: value dorks only", () => {
    expect(buildDorks({ ...ctx, onlyValues: true }).every((d) => d.kind === "value")).toBe(true);
  });

  it("removes double quotes from the name and the values", () => {
    const [dork] = buildDorks({ name: 'Léa "Lily" Martin', values: { C1: ['Neu"châtel'] }, onlyValues: true });
    expect(dork!.query).toBe('"Léa Lily Martin" "Neuchâtel"');
  });
});

describe("keepsPage", () => {
  const url = "https://exemple.ch/page";

  it("keeps an inverted name with the city", () => {
    expect(keepsPage(dorks[0]!, ctx.name, { url, title: "Martin Léa - Neuchâtel" })).toBe(true);
  });

  it("drops another name, and a missing city", () => {
    expect(keepsPage(dorks[0]!, ctx.name, { url, title: "Léa Martinez - Neuchâtel" })).toBe(false);
    expect(keepsPage(dorks[0]!, ctx.name, { url, title: "Léa Martin - Lausanne" })).toBe(false);
  });

  it("drops a list where the first and last names belong to two people", () => {
    const pdf = buildDorks(ctx).find((d) => d.field === "I3")!;
    expect(keepsPage(pdf, ctx.name, { url, title: "Liste des membres", content: "Léa Dupont, Paul Martin" })).toBe(false);
  });

  it("pseudo dork: platform address and pseudo, name not required", () => {
    const dork = find("pseudo", "F2");
    const page = { url: "https://www.instagram.com/lmartin_06/", title: "lmartin_06 • Instagram" };
    expect(keepsPage(dork, undefined, page)).toBe(true);
    expect(keepsPage(dork, undefined, { ...page, url: "https://exemple.ch/lmartin_06" })).toBe(false);
  });

  it("press dork: address on a press domain and the name", () => {
    const dork = find("keyword", "G3");
    const host = PRESS_DOMAINS[0]!;
    expect(keepsPage(dork, ctx.name, { url: `https://www.${host}/a`, title: "Léa Martin sacrée championne" })).toBe(true);
    expect(keepsPage(dork, ctx.name, { url, title: "Léa Martin sacrée championne" })).toBe(false);
  });

  it("keyword dork: needs one of the keywords", () => {
    const dork = find("keyword", "G1");
    expect(keepsPage(dork, ctx.name, { url, title: "Léa Martin", content: "Classement final" })).toBe(true);
    expect(keepsPage(dork, ctx.name, { url, title: "Léa Martin", content: "Rien" })).toBe(false);
  });
});
