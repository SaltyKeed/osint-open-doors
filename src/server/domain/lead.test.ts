import { describe, expect, it } from "vitest";
import { normalizeIdentifier, type IdentifierType } from "./identifier";
import { canPivot, childLead, inputLead } from "./lead";

const id = (type: IdentifierType, raw: string) => normalizeIdentifier(type, raw)!;
const input = inputLead(id("EMAIL", "lea@example.ch"));

describe("canPivot", () => {
  it("an input is confirmed and relaunches", () => {
    expect(input.confidence).toBe("confirme");
    expect(canPivot(input)).toBe(true);
  });

  it("probable relaunches one level only", () => {
    const pseudo = childLead(input, "github", id("PSEUDO", "lmartin06"), "probable", false);
    const profile = childLead(pseudo, "sites", id("PROFIL", "https://steam.example/lmartin06"), "probable", false);
    expect(canPivot(pseudo)).toBe(true);
    expect(canPivot(profile)).toBe(false);
  });

  it("a confirmed finding below a probable one relaunches again, and so do its children", () => {
    const pseudo = childLead(input, "github", id("PSEUDO", "lmartin06"), "probable", false);
    const mail = childLead(pseudo, "leaks", id("EMAIL", "lm@example.ch"), "confirme", false);
    const phone = childLead(mail, "leaks", id("TEL", "079 123 45 67"), "confirme", false);
    expect(canPivot(mail)).toBe(true);
    expect(canPivot(phone)).toBe(true);
  });

  it("a name relaunches only when confirmed", () => {
    expect(canPivot(childLead(input, "leaks", id("NOM", "Léa Martin"), "confirme", false))).toBe(true);
    expect(canPivot(childLead(input, "leaks", id("NOM", "Léa Martin"), "probable", false))).toBe(false);
  });

  it("possible, namesakes and relatives never relaunch", () => {
    expect(canPivot(childLead(input, "local", id("PSEUDO", "lea"), "possible", false))).toBe(false);
    expect(canPivot(childLead(input, "x", id("NOM", "Paul Martin"), "homonyme", false))).toBe(false);
    expect(canPivot(childLead(input, "github", id("PSEUDO", "pmartin"), "confirme", true))).toBe(false);
  });

  it("keeps the path of the parent", () => {
    const pseudo = childLead(input, "github", id("PSEUDO", "lmartin06"), "confirme", false);
    expect(pseudo.path.map((s) => s.sourceId)).toEqual(["saisie", "github"]);
  });
});
