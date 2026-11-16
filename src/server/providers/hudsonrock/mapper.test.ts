import { describe, expect, it } from "vitest";
import { toDomainFindings, toEmailFindings, toUsernameFindings } from "./mapper";

// Invented answer (fixtures never contain real data).
const found = {
  message: "This email address is associated with a computer that was infected by an info-stealer",
  stealers: [
    {
      total_corporate_services: 2,
      total_user_services: 40,
      date_compromised: "2025-03-02T10:00:00.000Z",
      stealer_family: "Lumma",
      computer_name: "PC-INVENTE (Jean)",
      operating_system: "Windows 11",
      ip: "192.0.**.**",
      top_passwords: ["S*****t", "A******1"],
      top_logins: ["j***@example.com"],
    },
    {
      total_corporate_services: 0,
      total_user_services: 8,
      date_compromised: "2024-01-15T10:00:00.000Z",
      stealer_family: "Generic Stealer",
      computer_name: "AUTRE-PC",
      top_passwords: ["Z****9"],
    },
  ],
};

describe("hudsonrock mapper", () => {
  it("summarizes the infected computers found with the email", () => {
    const [finding] = toEmailFindings(found);
    expect(finding).toMatchObject({ kind: "account", providerId: "hudsonrock", matchedOn: "email" });
    expect(finding?.summary).toContain("2 ordinateurs infectés");
    expect(finding?.summary).toContain("mars 2025");
    expect(finding?.summary).toContain("Lumma");
    expect(finding?.summary).toContain("50 comptes");
    expect(finding?.categories).toContain("password");
  });

  it("never lets a password, login, IP or computer name through", () => {
    const text = JSON.stringify([...toEmailFindings(found), ...toUsernameFindings(found, "jdupont42")]);
    for (const secret of ["S*****t", "A******1", "Z****9", "j***@example.com", "192.0", "PC-INVENTE", "AUTRE-PC"]) {
      expect(text).not.toContain(secret);
    }
    expect(text).not.toContain("Generic");
  });

  it("returns nothing when no computer is found", () => {
    expect(toEmailFindings({ message: "not found", stealers: [] })).toEqual([]);
    expect(toEmailFindings("not json")).toEqual([]);
  });

  it("gives only totals for the organization of the email", () => {
    const raw = {
      total: 30,
      employees: 4,
      users: 26,
      data: { employees_urls: [{ occurrence: 3, type: "Employee", url: "https://vpn.ecole-exemple.ch/login" }] },
    };
    const [finding] = toDomainFindings(raw, "ecole-exemple.ch");
    expect(finding?.summary).toContain("30 ordinateurs");
    expect(JSON.stringify(finding)).not.toContain("vpn.");
    expect(toDomainFindings({ total: 0 }, "ecole-exemple.ch")).toEqual([]);
  });

  it("only counts the computers found with a username (maybe someone else)", () => {
    expect(toUsernameFindings(found, "jdupont42")).toEqual([
      expect.objectContaining({ kind: "count", count: 2, matchedOn: "username" }),
    ]);
  });
});
