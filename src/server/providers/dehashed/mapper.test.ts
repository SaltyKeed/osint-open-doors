import { describe, expect, it } from "vitest";
import { toFindings, toNameFindings, toUsernameFindings } from "./mapper";

// Invented answer (fixtures never contain real data).
const answer = {
  balance: 99,
  total: 3,
  took: "10ms",
  entries: [
    {
      id: "1",
      database_name: "ExempleShop",
      email: ["jean@exemple.ch"],
      password: ["MotDePasseSecret1"],
      address: ["Rue Inventée 12"],
      phone: [""],
    },
    { id: "2", database_name: "ExempleShop", email: ["jean@exemple.ch"], hashed_password: ["$2y$10$abcdefghij"] },
    { id: "3", database_name: "AutreForum", email: ["jean@exemple.ch"], ip_address: ["192.0.2.10"], name: ["Jean Exemple"] },
  ],
};

describe("dehashed mapper", () => {
  it("gives one breach per database with the kinds of data, found with the email", () => {
    const findings = toFindings(answer, "email");
    expect(findings).toEqual([
      expect.objectContaining({ source: "ExempleShop", categories: ["password", "address", "email"], matchedOn: "email" }),
      expect.objectContaining({ source: "AutreForum", categories: ["ipAddress", "name", "email"] }),
    ]);
  });

  it("never lets a value through", () => {
    const text = JSON.stringify([
      ...toFindings(answer, "email"),
      ...toNameFindings(answer, { email: "jean@exemple.ch" }),
      ...toUsernameFindings(answer, "jexemple"),
    ]);
    for (const secret of ["MotDePasseSecret1", "abcdefghij", "Rue Inventée", "192.0.2.10", "jean@exemple.ch", "Jean Exemple"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("details records found by name only when they hold the visitor's email (anti-homonym)", () => {
    const withOthers = {
      entries: [...answer.entries, { id: "4", database_name: "Homonyme", email: ["autre@exemple.ch"], name: ["Jean Exemple"] }],
    };
    const findings = toNameFindings(withOthers, { email: "Jean@Exemple.ch" });
    expect(findings.filter((f) => f.kind === "breach").map((f) => f.kind === "breach" && f.source)).toEqual([
      "ExempleShop",
      "AutreForum",
    ]);
    expect(findings.find((f) => f.kind === "count")).toMatchObject({ count: 1, matchedOn: "name" });
  });

  it("only counts the databases found with a username", () => {
    expect(toUsernameFindings(answer, "jexemple")).toEqual([expect.objectContaining({ kind: "count", count: 2 })]);
  });

  it("returns nothing for an empty or invalid answer", () => {
    expect(toFindings({ balance: 1, total: 0, entries: null }, "email")).toEqual([]);
    expect(toFindings("oops", "phone")).toEqual([]);
  });
});
