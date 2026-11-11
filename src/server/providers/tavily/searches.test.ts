import { describe, expect, it } from "vitest";
import { plannedSearches } from "./searches";

describe("plannedSearches", () => {
  it("searches the email and the phone as a whole", () => {
    const searches = plannedSearches({ email: "jean.dupont@example.com", phone: "+41791234567" });
    expect(searches.map((s) => [s.searchedOn, s.text])).toEqual([
      ["email", '"jean.dupont@example.com"'],
      ["phone", '"+41 79 123 45 67" OR "079 123 45 67" OR "0791234567" OR "+41791234567"'],
    ]);
  });

  it("always searches first and last name together, on several themes", () => {
    const searches = plannedSearches({ firstName: "Jean", lastName: "Dupont" });
    expect(searches).toHaveLength(5);
    expect(searches.every((s) => s.searchedOn === "name" && s.text.startsWith('"Jean Dupont"'))).toBe(true);
    expect(searches.filter((s) => s.options.includeDomains)).toHaveLength(3);
  });

  it("does not search a name without both parts", () => {
    expect(plannedSearches({ firstName: "Jean" })).toEqual([]);
  });
});
