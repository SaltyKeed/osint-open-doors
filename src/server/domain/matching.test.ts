import { describe, expect, it } from "vitest";
import { containsFullName, strongMatch } from "./matching";

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
