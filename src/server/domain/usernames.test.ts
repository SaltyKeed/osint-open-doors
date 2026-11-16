import { describe, expect, it } from "vitest";
import { generateUsernames, lastNameShortForms, numberParts, recognizeHandle } from "./usernames";

describe("recognizeHandle", () => {
  const leo = { firstName: "Léo", lastName: "Rochat", birthDate: "2006-03-14" };

  it("explains a username built from the name and the birth date", () => {
    expect(recognizeHandle("Leo.RCT14", leo)).toEqual({
      handle: "Leo.RCT14",
      explanation: "ton prénom (leo) + ton nom abrégé (rct) + ton jour de naissance (14)",
      usesBirthDate: true,
      strong: true,
    });
  });

  it("recognizes a username made of the name only, without the date", () => {
    expect(recognizeHandle("lrochat", leo)).toMatchObject({
      explanation: "l'initiale de ton prénom (l) + ton nom (rochat)",
      usesBirthDate: false,
      strong: false,
    });
    expect(recognizeHandle("leo.rochat", leo)?.strong).toBe(true);
    expect(recognizeHandle("leor", leo)?.strong).toBe(false);
  });

  it("does not recognize a username built from something else", () => {
    expect(recognizeHandle("leo.rct15", leo)).toBeNull();
    expect(recognizeHandle("gamer4242", leo)).toBeNull();
  });
});

describe("lastNameShortForms", () => {
  it("abbreviates a last name the way people do in usernames", () => {
    expect(lastNameShortForms("rochat")).toEqual(["rct", "rcht", "roc", "rt", "r"]);
  });

  it("skips forms that are not shorter than the name", () => {
    expect(lastNameShortForms("li")).toEqual(["l"]);
  });
});

describe("numberParts", () => {
  it("cuts a birth date into the pieces people add to usernames", () => {
    expect(numberParts({ birthDate: "2006-03-14" })).toEqual(["06", "14", "2006", "1403", "140306", "0314", "03"]);
  });

  it("uses the year alone when only the year is known", () => {
    expect(numberParts({ birthYear: "2006" })).toEqual(["06", "2006"]);
    expect(numberParts({})).toEqual([]);
  });
});

describe("generateUsernames", () => {
  const leo = { firstName: "Léo", lastName: "Rochat", birthDate: "2006-03-14" };

  it("starts with the most common forms of the full name", () => {
    expect(generateUsernames({ firstName: "Jean", lastName: "Dupont" }, 4)).toEqual(["jeandupont", "jean.dupont", "jean_dupont", "jdupont"]);
  });

  it("finds a first name + short last name + birth day form such as leo.rct14", () => {
    expect(generateUsernames(leo, 60)).toContain("leo.rct14");
  });

  it("combines separators, abbreviations and date pieces", () => {
    const names = generateUsernames(leo, 400);
    for (const expected of ["leo_rct14", "leorct14", "leo.rochat06", "leo_rochat_2006", "lrochat14", "rochat.leo", "leo.r1403"]) {
      expect(names).toContain(expected);
    }
  });

  it("removes accents, spaces, hyphens and apostrophes", () => {
    expect(generateUsernames({ firstName: "Hélène", lastName: "D'Agostino-Rey" }, 2)).toEqual([
      "helenedagostinorey",
      "helene.dagostinorey",
    ]);
  });

  it("skips the username and email part the visitor already gave (they are checked anyway)", () => {
    const names = generateUsernames({ firstName: "Jean", lastName: "Dupont", username: "JeanDupont", email: "jdupont@example.ch" });
    expect(names).not.toContain("jeandupont");
    expect(names).not.toContain("jdupont");
  });

  it("needs both the first and the last name", () => {
    expect(generateUsernames({ firstName: "Jean" })).toEqual([]);
    expect(generateUsernames({ lastName: "Dupont" })).toEqual([]);
  });

  it("returns valid usernames without duplicates, best first", () => {
    const names = generateUsernames(leo, 1000);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((u) => /^[a-z0-9._-]{3,40}$/.test(u))).toBe(true);
    expect(names.indexOf("leorochat")).toBeLessThan(names.indexOf("leo.rct14"));
  });
});
