import { describe, expect, it } from "vitest";
import commits from "@/tests/fixtures/github/commits.json";
import userEmpty from "@/tests/fixtures/github/user-empty.json";
import user from "@/tests/fixtures/github/user.json";
import { toRecords } from "./mapper";
import { githubCommitsSchema, githubUserSchema } from "./schema";

describe("toRecords", () => {
  it("builds the profile record with only the whitelisted fields, and the repositories of its commits", () => {
    // toStrictEqual fails if bio, commit messages or counters get through.
    const [profile] = toRecords(githubCommitsSchema.parse(commits), [githubUserSchema.parse(user)]);
    expect(profile).toStrictEqual({
      about: "subject",
      fields: [
        { field: "A1", value: "Léa Martin" },
        { field: "A5", value: "https://avatars.githubusercontent.com/u/1?v=4" },
        { field: "B1", value: "contact@leamartin.ch" },
        { field: "C1", value: "Neuchâtel, Suisse" },
        { field: "E1", value: "exemple-sa" },
        { field: "E3", value: "lmartin06/projet-cpne" },
        { field: "E3", value: "exemple-org/site-club" },
        { field: "F1", value: "lmartin06" },
        { field: "F1", value: "lea_martin_ne" },
        { field: "F2", value: "https://github.com/lmartin06" },
        { field: "F3", value: "https://leamartin.ch" },
      ],
      identifiers: [
        { type: "PSEUDO", value: "lmartin06" },
        { type: "PSEUDO", value: "lea_martin_ne" },
        { type: "EMAIL", value: "contact@leamartin.ch" },
        { type: "DOMAINE", value: "leamartin.ch" },
      ],
    });
  });

  it("keeps commits not linked to an account as a record with the author names and repositories", () => {
    const records = toRecords(githubCommitsSchema.parse(commits), [githubUserSchema.parse(user)]);
    expect(records[1]).toStrictEqual({
      about: "subject",
      fields: [
        { field: "A1", value: "L. Martin" },
        { field: "E3", value: "ancien/projet" },
      ],
      identifiers: [],
    });
  });

  it("treats the placeholder account of an unknown email as no account", () => {
    const placeholder = { items: [{ ...commits.items[2], author: { login: "invalid-email-address" } }] };
    expect(toRecords(githubCommitsSchema.parse(placeholder), [])).toStrictEqual([
      { about: "subject", fields: [{ field: "A1", value: "L. Martin" }, { field: "E3", value: "ancien/projet" }], identifiers: [] },
    ]);
  });

  it("leaves out empty values of a profile found by pseudo", () => {
    expect(toRecords(null, [githubUserSchema.parse(userEmpty)])).toStrictEqual([
      {
        about: "subject",
        fields: [
          { field: "A5", value: "https://avatars.githubusercontent.com/u/2?v=4" },
          { field: "F1", value: "userx" },
          { field: "F2", value: "https://github.com/userx" },
        ],
        identifiers: [{ type: "PSEUDO", value: "userx" }],
      },
    ]);
  });
});
