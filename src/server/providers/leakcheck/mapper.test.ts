import { describe, expect, it } from "vitest";
import { toEmailFindings, toUsernameFindings } from "./mapper";

// Invented answers (fixtures never contain real data).
const found = {
  success: true,
  found: 3,
  fields: ["username", "password", "dob", "address", "zip", "ip", "first_name", "unknown_field"],
  sources: [
    { name: "Exemple.com", date: "2017-05" },
    { name: "Autre-Site", date: "" },
  ],
};

describe("leakcheck mapper", () => {
  it("turns each source into a breach found with the email", () => {
    const findings = toEmailFindings(found);
    const breaches = findings.filter((f) => f.kind === "breach");
    expect(breaches).toEqual([
      expect.objectContaining({ kind: "breach", source: "Exemple.com", year: "2017", categories: ["email"], matchedOn: "email" }),
      expect.objectContaining({ source: "Autre-Site", year: undefined }),
    ]);
  });

  it("lists the exposed data types once, as categories, never their values", () => {
    const summary = toEmailFindings(found).find((f) => f.kind === "account");
    expect(summary).toMatchObject({ kind: "account", matchedOn: "email" });
    expect(summary?.kind === "account" && summary.categories).toEqual(
      expect.arrayContaining(["username", "password", "birthDate", "address", "ipAddress", "name", "other"]),
    );
    expect(JSON.stringify(summary)).not.toContain("unknown_field");
  });

  it("returns nothing when the email is not found", () => {
    expect(toEmailFindings({ success: false, error: "Not found" })).toEqual([]);
  });

  it("only counts the breaches found with a username (maybe someone else)", () => {
    expect(toUsernameFindings(found, "jdupont42")).toEqual([
      expect.objectContaining({ kind: "count", count: 2, matchedOn: "username" }),
    ]);
    expect(toUsernameFindings({ success: false, error: "Not found" }, "jdupont42")).toEqual([]);
  });
});
