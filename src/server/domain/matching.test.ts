import { describe, expect, it } from "vitest";
import { strongMatch } from "./matching";

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
