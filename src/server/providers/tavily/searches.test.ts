import { describe, expect, it } from "vitest";
import { plannedSearches } from "./searches";

describe("plannedSearches", () => {
  it("searches the email and the phone as a whole", () => {
    const searches = plannedSearches({ email: "jean.dupont@example.com", phone: "+41791234567" });
    expect(searches.map((s) => [s.searchedOn, s.text])).toEqual([
      ["email", '"jean.dupont@example.com"'],
      ["phone", '"+41 79 123 45 67" OR "079 123 45 67" OR "0791234567" OR "+41791234567"'],
      ["phone", '"+41 79 123 45 67" OR "079 123 45 67" OR "0791234567" OR "+41791234567"'],
    ]);
    expect(searches[2]?.options.includeDomains).toContain("tellows.ch");
  });

  it("always searches first and last name together, on several themes", () => {
    const searches = plannedSearches({ firstName: "Jean", lastName: "Dupont" });
    expect(searches).toHaveLength(6);
    expect(searches.every((s) => s.searchedOn === "name")).toBe(true);
    expect(searches.filter((s) => s.text.startsWith('"Jean Dupont"'))).toHaveLength(5);
    expect(searches[5]?.text).toBe('"J. Dupont" OR "Dupont J."');
    expect(searches.filter((s) => s.options.includeDomains)).toHaveLength(3);
  });

  it("adds a search with the city when it is given", () => {
    const searches = plannedSearches({ firstName: "Jean", lastName: "Dupont", city: "Nulle-Part" });
    expect(searches.at(-1)?.text).toBe('"Jean Dupont" "Nulle-Part"');
  });

  it("does not search a name without both parts", () => {
    expect(plannedSearches({ firstName: "Jean" })).toEqual([]);
  });
});
