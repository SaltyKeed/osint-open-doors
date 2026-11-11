import { describe, expect, it } from "vitest";
import { containsFullName, containsNameOrInitial, contextMatch, strongMatch } from "./matching";

describe("containsNameOrInitial", () => {
  it("accepts initial forms next to the last name", () => {
    expect(containsNameOrInitial("Classement : E. Pachoud 3e", "Enzo", "Pachoud")).toBe(true);
    expect(containsNameOrInitial("Pachoud E. (NE)", "Enzo", "Pachoud")).toBe(true);
    expect(containsNameOrInitial("PACHOUD, E.", "Enzo", "Pachoud")).toBe(true);
    expect(containsNameOrInitial("Enzo Pachoud", "Enzo", "Pachoud")).toBe(true);
  });

  it("rejects another initial or the last name alone", () => {
    expect(containsNameOrInitial("M. Pachoud", "Enzo", "Pachoud")).toBe(false);
    expect(containsNameOrInitial("La famille Pachoud", "Enzo", "Pachoud")).toBe(false);
  });
});

describe("contextMatch", () => {
  it("finds the city as a whole word, without accents", () => {
    expect(contextMatch("Jean Dupont, Neuchatel", { city: "Neuchâtel" })).toBe("localité");
    expect(contextMatch("Neuchâtelois", { city: "Neuchâtel" })).toBeNull();
  });

  it("finds the birth year as a number on its own", () => {
    expect(contextMatch("Dupont Jean 2007 NE", { birthYear: "2007" })).toBe("année de naissance");
    expect(contextMatch("Tel 0792007123", { birthYear: "2007" })).toBeNull();
  });
});

describe("containsFullName", () => {
  it("accepts the full name in either order, whatever the case and accents", () => {
    expect(containsFullName("Résultats : Enzo Pachoud, 2e", "Enzo", "Pachoud")).toBe(true);
    expect(containsFullName("PACHOUD, Enzo (Neuchâtel)", "Enzo", "Pachoud")).toBe(true);
    expect(containsFullName("Hélène Müller-Brand", "Helene", "Müller-Brand")).toBe(true);
  });

  it("rejects pages with only the first name or only the last name", () => {
    expect(containsFullName("Enzo Ferrari a fondé sa marque", "Enzo", "Pachoud")).toBe(false);
    expect(containsFullName("La famille Pachoud à Lausanne", "Enzo", "Pachoud")).toBe(false);
    expect(containsFullName("Enzo et Marie Pachoud", "Enzo", "Pachoud")).toBe(false);
  });

  it("does not match inside another word", () => {
    expect(containsFullName("Lorenzo Pachoud", "Enzo", "Pachoud")).toBe(false);
  });
});

const query = { email: "jean.dupont@example.com", phone: "+41791234567", firstName: "Jean", lastName: "Dupont" };

describe("strongMatch (anti-homonym rule)", () => {
  it("links a text containing the email, whatever the case", () => {
    expect(strongMatch("Write to JEAN.DUPONT@example.com", query)).toBe("email");
  });

  it("links a text containing the phone in any format", () => {
    expect(strongMatch("Tel. 079/123.45.67", query)).toBe("phone");
    expect(strongMatch("Call +41 79 123 45 67", query)).toBe("phone");
  });

  it("does not link a text that only contains the name", () => {
    expect(strongMatch("Jean Dupont won the race", query)).toBeNull();
  });
});
