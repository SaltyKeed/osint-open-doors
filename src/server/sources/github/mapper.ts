import "server-only";
import type { Attribute, FoundValue } from "@/server/domain/fiche";
import { normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";
import type { GithubCommitSearch, GithubUser } from "./schema";

const present = (s: string | null | undefined): s is string => typeof s === "string" && s.trim().length > 0;
const distinct = (items: string[]) => [...new Set(items)];
const swissDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CH", { timeZone: "UTC" });

/**
 * `known` are identifiers the record is known to hold: the email used to find
 * the account, or nothing when the account was found by its pseudo.
 */
export function toGithubUserRecord(user: GithubUser, known: Identifier[]): SourceRecord {
  const attributes: Attribute[] = [
    ...(present(user.bio) ? [{ label: "Bio", value: user.bio, known: true }] : []),
    ...(present(user.created_at) ? [{ label: "Créé le", value: swissDate(user.created_at), known: true }] : []),
    ...(user.public_repos !== undefined ? [{ label: "Dépôts publics", value: String(user.public_repos), known: true }] : []),
    ...(user.followers !== undefined ? [{ label: "Abonnés", value: String(user.followers), known: true }] : []),
  ];
  const values: FoundValue[] = [
    ...(present(user.name) ? [{ field: "A1" as const, value: user.name }] : []),
    ...(present(user.avatar_url) ? [{ field: "A5" as const, value: user.avatar_url }] : []),
    ...(present(user.location) ? [{ field: "C1" as const, value: user.location }] : []),
    ...(present(user.company) ? [{ field: "E1" as const, value: user.company.replace(/^@/, "") }] : []),
    { field: "F1", value: user.login },
    { field: "F2", value: user.html_url, attributes },
    ...(present(user.blog) ? [{ field: "F3" as const, value: user.blog }] : []),
    ...(present(user.email) ? [{ field: "B1" as const, value: user.email }] : []),
  ];
  const candidates: (Identifier | null)[] = [
    ...known,
    present(user.email) ? normalizeIdentifier("EMAIL", user.email) : null,
    normalizeIdentifier("PSEUDO", user.login),
    normalizeIdentifier("PROFIL", user.html_url),
    present(user.blog) ? normalizeIdentifier("DOMAINE", user.blog) : null,
    present(user.twitter_username) ? normalizeIdentifier("PROFIL", `https://x.com/${user.twitter_username}`) : null,
  ];
  const seen = new Set<string>();
  const identifiers = candidates
    .filter((i): i is Identifier => i !== null)
    .filter((i) => !seen.has(`${i.type}:${i.value}`) && seen.add(`${i.type}:${i.value}`))
    .map((identifier) => ({ identifier }));
  // The account is the origin (see profiles/record.ts).
  const origin = normalizeIdentifier("PROFIL", user.html_url)?.value ?? user.html_url;
  return { origin, evidence: user.html_url, values, identifiers };
}

/** Commits made with the email: author names, projects, and the accounts linked to them. */
export function toCommitRecords(search: GithubCommitSearch, email: Identifier): { logins: string[]; records: SourceRecord[] } {
  const logins = distinct(search.items.map((i) => i.author?.login).filter(present));
  const names = distinct(search.items.map((i) => i.commit.author?.name).filter(present));
  const repos = distinct(search.items.map((i) => i.repository.full_name));
  if (names.length === 0 && repos.length === 0) return { logins, records: [] };
  const record: SourceRecord = {
    origin: "GitHub",
    evidence: null,
    values: [
      ...names.map((value) => ({ field: "A1" as const, value })),
      ...repos.map((value) => ({ field: "E3" as const, value })),
    ],
    identifiers: [{ identifier: email }],
  };
  return { logins, records: [record] };
}
