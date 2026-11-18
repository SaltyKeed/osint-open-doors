import { describe, expect, it } from "vitest";
import { normalizeIdentifier } from "@/server/domain/identifier";
import { toGithubUserRecord, toCommitRecords } from "./github/mapper";
import { githubCommitSearchSchema, githubUserSchema } from "./github/schema";
import { toGravatarRecord } from "./gravatar/mapper";
import { gravatarProfileSchema } from "./gravatar/schema";
import { toHudsonRockRecords } from "./hudsonrock/mapper";
import { hudsonRockSchema } from "./hudsonrock/schema";
import { toLeakCheckRecords } from "./leakcheck/mapper";
import { leakCheckPublicSchema } from "./leakcheck/schema";
import { toXposedRecords } from "./xposedornot/mapper";

// All values below are invented test data.
const email = normalizeIdentifier("EMAIL", "lea@example.ch")!;
const types = (ids: { identifier: { type: string; value: string } }[]) => ids.map((i) => `${i.identifier.type}:${i.identifier.value}`);

describe("gravatar", () => {
  const profile = gravatarProfileSchema.parse({
    hash: "abc",
    display_name: "Léa Martin",
    profile_url: "https://gravatar.com/lmartin06",
    avatar_url: "https://0.gravatar.com/avatar/abc",
    location: "Neuchâtel",
    description: "Étudiante",
    job_title: "Apprentie",
    company: "CPNE",
    verified_accounts: [{ service_label: "GitHub", url: "https://github.com/lmartin06", is_hidden: false }],
    contact_info: { cell_phone: "079 000 00 00" },
  });

  it("keeps only the whitelisted fields", () => {
    expect(JSON.stringify(profile)).not.toContain("079");
  });

  it("maps the profile to the fiche and pivots on the profile and linked accounts", () => {
    const record = toGravatarRecord(profile, email);
    expect(record.values.map((v) => `${v.field}=${v.value}`)).toEqual([
      "A1=Léa Martin",
      "A5=https://0.gravatar.com/avatar/abc",
      "C1=Neuchâtel",
      "E1=Apprentie, CPNE",
      "F2=https://gravatar.com/lmartin06",
      "F2=https://github.com/lmartin06",
    ]);
    expect(types(record.identifiers)).toEqual([
      "EMAIL:lea@example.ch",
      "PROFIL:https://gravatar.com/lmartin06",
      "PROFIL:https://github.com/lmartin06",
    ]);
  });
});

describe("github", () => {
  const user = githubUserSchema.parse({
    login: "lmartin06",
    html_url: "https://github.com/lmartin06",
    avatar_url: "https://avatars.example/u/1",
    name: "Léa Martin",
    company: "@cpne",
    blog: "https://leamartin.ch",
    location: "Neuchâtel",
    email: null,
    bio: "Code et volley",
    twitter_username: "lea_m",
    public_repos: 4,
    followers: 2,
    created_at: "2023-02-01T10:00:00Z",
  });

  it("maps a user and pivots on pseudo, profile, domain and X account", () => {
    const record = toGithubUserRecord(user, [email]);
    expect(record.values.map((v) => v.field)).toEqual(["A1", "A5", "C1", "E1", "F1", "F2", "F3"]);
    expect(record.values.find((v) => v.field === "F2")?.attributes?.map((a) => a.label)).toEqual([
      "Bio",
      "Créé le",
      "Dépôts publics",
      "Abonnés",
    ]);
    expect(types(record.identifiers)).toEqual([
      "EMAIL:lea@example.ch",
      "PSEUDO:lmartin06",
      "PROFIL:https://github.com/lmartin06",
      "DOMAINE:leamartin.ch",
      "PROFIL:https://x.com/lea_m",
    ]);
  });

  it("finds the accounts behind commits made with the email", () => {
    const search = githubCommitSearchSchema.parse({
      total_count: 2,
      items: [
        { author: { login: "lmartin06" }, commit: { author: { name: "Léa Martin" } }, repository: { full_name: "lmartin06/site" } },
        { author: null, commit: { author: { name: "Léa M." } }, repository: { full_name: "club/volley" } },
      ],
    });
    const { logins, records } = toCommitRecords(search, email);
    expect(logins).toEqual(["lmartin06"]);
    expect(records[0]?.values.map((v) => `${v.field}=${v.value}`)).toEqual([
      "A1=Léa Martin",
      "A1=Léa M.",
      "E3=lmartin06/site",
      "E3=club/volley",
    ]);
  });
});

describe("hudson rock", () => {
  it("keeps the date and the system, never the computer name, IP or passwords", () => {
    const body = hudsonRockSchema.parse({
      message: "…",
      stealers: [
        {
          date_compromised: "2025-04-02T00:00:00.000Z",
          operating_system: "Windows 11",
          total_user_services: 12,
          total_corporate_services: 0,
          antiviruses: ["Defender"],
          computer_name: "PC-LEA",
          ip: "85.1.**.***",
          top_passwords: ["s*****t"],
        },
      ],
    });
    const records = toHudsonRockRecords(body, email);
    expect(records).toHaveLength(1);
    expect(records[0]?.values[0]?.field).toBe("H5");
    const text = JSON.stringify(records);
    expect(text).toContain("Windows 11");
    expect(text).not.toContain("PC-LEA");
    expect(text).not.toContain("85.1");
    expect(text).not.toContain("s*****t");
  });

  it("no infection, no record", () => {
    expect(toHudsonRockRecords(hudsonRockSchema.parse({ message: "…", stealers: [] }), email)).toEqual([]);
  });
});

describe("xposedornot", () => {
  it("one H1 value per breach, with year and exposed data in French", () => {
    const records = toXposedRecords(
      [
        {
          providerId: "xposedornot",
          source: "Pandabuy",
          domain: "pandabuy.com",
          year: 2024,
          categories: ["email", "password", "ip"],
          recordCount: 1300000,
          verified: true,
        },
      ],
      email,
    );
    expect(records[0]?.origin).toBe("Pandabuy");
    expect(records[0]?.values[0]).toMatchObject({ field: "H1", value: "Pandabuy" });
    expect(records[0]?.values[0]?.attributes).toEqual([
      { label: "Année", value: "2024", known: true },
      { label: "Données exposées", value: "email, mot de passe, adresse IP", known: true },
      { label: "Comptes touchés", value: "1300000", known: true },
    ]);
    expect(types(records[0]!.identifiers)).toEqual(["EMAIL:lea@example.ch"]);
  });
});

describe("leakcheck public", () => {
  it("one H1 value per breach with its date, and the data types found", () => {
    const body = leakCheckPublicSchema.parse({
      success: true,
      found: 3,
      fields: ["username", "password", "phone", "ssn_like_unknown"],
      sources: [
        { name: "Pandabuy.com", date: "2024-03" },
        { name: "OldForum", date: "" },
      ],
    });
    const records = toLeakCheckRecords(body, email);
    expect(records.map((r) => r.origin)).toEqual(["Pandabuy.com", "OldForum", "LeakCheck"]);
    expect(records[0]?.values[0]).toEqual({
      field: "H1",
      value: "Pandabuy.com",
      attributes: [{ label: "Date", value: "2024-03", known: true }],
    });
    expect(records[1]?.values[0]?.attributes).toEqual([]);
    expect(records[2]?.values[0]).toEqual({
      field: "H2",
      value: "Données présentes dans ces fuites : pseudo, mot de passe, téléphone, ssn_like_unknown",
    });
    expect(types(records[0]!.identifiers)).toEqual(["EMAIL:lea@example.ch"]);
  });

  it("not found gives no record", () => {
    expect(toLeakCheckRecords(leakCheckPublicSchema.parse({ success: false, error: "Not found" }), email)).toEqual([]);
  });
});
