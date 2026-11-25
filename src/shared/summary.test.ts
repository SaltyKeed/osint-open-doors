import { describe, expect, it } from "vitest";
import type { Finding } from "@/server/domain/finding";
import { summarize } from "./summary";

// All values below are invented test data.

let counter = 0;

type Confidence = Finding["confidence"];

function finding(field: Finding["field"], confidence: Confidence = "confirmed", extra: Partial<Finding> = {}): Finding {
  return { field, value: `value-${field}-${counter++}`, sources: ["test"], confidence, path: [], ...extra };
}

const ids = (findings: Finding[]) => summarize(findings).actions.map((a) => a.id);

describe("summarize: fill rate", () => {
  it("gives 0 of 30 and no action for an empty list, but keeps the 'beyond' section", () => {
    const summary = summarize([]);
    expect(summary.fill).toEqual({ confirmed: 0, probable: 0, total: 30 });
    expect(summary.categories).toHaveLength(10);
    expect(summary.categories.every((c) => c.confirmed === 0 && c.probable === 0)).toBe(true);
    expect(summary.actions).toEqual([]);
    expect(summary.beyond).toHaveLength(5);
    expect(summary.beyond.every((b) => b.title !== "" && b.detail !== "")).toBe(true);
  });

  it("counts fields, not findings", () => {
    const summary = summarize([finding("B1"), finding("B1"), finding("A1", "probable")]);
    expect(summary.fill).toEqual({ confirmed: 1, probable: 1, total: 30 });
    expect(summary.categories.find((c) => c.code === "B")).toMatchObject({ confirmed: 1, probable: 0, total: 3 });
    expect(summary.categories.find((c) => c.code === "A")).toMatchObject({ confirmed: 0, probable: 1, total: 5 });
  });

  it("counts a field with a confirmed and a probable finding as confirmed only", () => {
    const summary = summarize([finding("B1", "probable"), finding("B1", "confirmed")]);
    expect(summary.fill).toEqual({ confirmed: 1, probable: 0, total: 30 });
  });

  it("ignores to_confirm, possible and namesake findings, and gives them no action", () => {
    const hidden: Confidence[] = ["to_confirm", "possible", "namesake"];
    const findings = hidden.flatMap((c) => (["H1", "H3", "H5", "B2", "B3", "F2", "I1", "A5"] as const).map((f) => finding(f, c)));
    const summary = summarize(findings);
    expect(summary.fill).toEqual({ confirmed: 0, probable: 0, total: 30 });
    expect(summary.actions).toEqual([]);
  });
});

describe("summarize: action plan", () => {
  it.each([
    ["H3", "exposed-password", "urgent"],
    ["H5", "infected-computer", "urgent"],
    ["H1", "breaches", "important"],
    ["B2", "public-phone", "important"],
    ["B3", "public-address", "important"],
    ["F2", "accounts", "review"],
    ["I1", "web-pages", "review"],
    ["A5", "profile-photos", "review"],
  ] as const)("%s gives the action %s (%s)", (field, id, urgency) => {
    for (const confidence of ["confirmed", "probable"] as const) {
      const actions = summarize([finding(field, confidence)]).actions;
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({ id, urgency });
      expect(actions[0]?.title).not.toBe("");
      expect(actions[0]?.detail).not.toBe("");
    }
  });

  it("gives one action per rule, even with several findings", () => {
    expect(ids([finding("F2"), finding("F2"), finding("F2")])).toEqual(["accounts"]);
  });

  it("gives the number of breaches and their names", () => {
    const action = summarize([
      finding("H1", "confirmed", { value: "ExempleShop" }),
      finding("H1", "probable", { value: "FauxForum" }),
    ]).actions[0];
    expect(action?.detail).toContain("2 fuites");
    expect(action?.detail).toContain("ExempleShop");
    expect(action?.detail).toContain("FauxForum");
  });

  it("gives the number of accounts and of pages", () => {
    const actions = summarize([finding("F2"), finding("F2"), finding("I1")]).actions;
    expect(actions.find((a) => a.id === "accounts")?.detail).toContain("2 comptes");
    expect(actions.find((a) => a.id === "web-pages")?.detail).toContain("1 page");
  });

  it("counts the same value written twice once (round 1 and round 2)", () => {
    const actions = summarize([
      finding("F2", "confirmed", { value: "https://github.com/LMartin" }),
      finding("F2", "confirmed", { value: "https://github.com/lmartin " }),
    ]).actions;
    expect(actions.find((a) => a.id === "accounts")?.detail).toContain("1 compte");
  });

  it("puts the pronoun in the plural for several pages", () => {
    const detail = summarize([finding("I1"), finding("I1"), finding("I1")]).actions.find((a) => a.id === "web-pages")?.detail;
    expect(detail).toContain("3 pages citent");
    expect(detail).toContain("de les retirer");
    expect(detail).toContain("de les déréférencer");
    const one = summarize([finding("I1")]).actions.find((a) => a.id === "web-pages")?.detail;
    expect(one).toContain("de la retirer");
  });

  it("asks to change passwords only when a breach exposed passwords", () => {
    const breach = (dataTypes: ("email" | "password" | "name")[]) =>
      finding("H1", "confirmed", { breach: { domain: null, year: null, dataTypes, records: null, verified: true } });
    const withPassword = summarize([breach(["email", "password"])]).actions.find((a) => a.id === "breaches")?.detail;
    expect(withPassword).toContain("Change ton mot de passe");
    const without = summarize([breach(["email", "name"])]).actions.find((a) => a.id === "breaches")?.detail;
    expect(without).not.toContain("Change ton mot de passe");
    expect(without).toContain("arnaque");
  });

  it("orders urgent, then important, then review, in the order of the rules", () => {
    const all = (["A5", "I1", "F2", "B3", "B2", "H1", "H5", "H3"] as const).map((f) => finding(f));
    expect(ids(all)).toEqual([
      "exposed-password",
      "infected-computer",
      "breaches",
      "public-phone",
      "public-address",
      "accounts",
      "web-pages",
      "profile-photos",
    ]);
  });

  it("never repeats a value of the visitor", () => {
    const values = [
      "lea.martin@exemple.ch",
      "+41791234567",
      "Rue du Lac 1, Neuchâtel",
      "Léa Martin",
      "https://site.exemple.ch/lmartin_06",
      "https://journal.exemple.ch/lea-martin-championne",
      "https://cdn.exemple.ch/lea.jpg",
      "Mot2passe!",
      "2025-03-01",
    ];
    const findings = [
      finding("B1", "confirmed", { value: values[0] }),
      finding("B2", "confirmed", { value: values[1] }),
      finding("B3", "confirmed", { value: values[2] }),
      finding("A1", "confirmed", { value: values[3] }),
      finding("F2", "confirmed", { value: values[4] }),
      finding("I1", "confirmed", { value: values[5] }),
      finding("A5", "confirmed", { value: values[6] }),
      finding("H3", "confirmed", { value: values[7] }),
      finding("H5", "confirmed", { value: values[8] }),
    ];
    const text = JSON.stringify(summarize(findings).actions);
    expect(text).toContain("public-phone");
    for (const value of values) expect(text).not.toContain(value);
  });
});
