import type { Identifier } from "@/server/domain/identifier";
import type { SourceField, SourceRecord } from "@/server/domain/source";
import type { GithubCommits, GithubUser } from "./schema";

function hostnameOf(url: string): string | null {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }
}

/** Placeholder accounts of GitHub: an unknown email ("invalid-email-address") or a deleted account ("ghost"). */
const PLACEHOLDER_LOGINS: ReadonlySet<string> = new Set(["invalid-email-address", "ghost"]);

/** Login of the real account behind a commit, or null when the commit is linked to none. */
export function linkedLogin(item: GithubCommits["items"][number]): string | null {
  const login = item.author?.login;
  return login && !PLACEHOLDER_LOGINS.has(login) ? login : null;
}

/** Repositories of the commits made by `login` (null: commits not linked to an account). */
function repositories(commits: GithubCommits | null, login: string | null): string[] {
  const items = commits?.items.filter((i) => linkedLogin(i) === login) ?? [];
  return [...new Set(items.map((i) => i.repository.full_name))];
}

// Second whitelist: each field is copied one by one, empty values are left out.
function userRecord(user: GithubUser, repos: string[]): SourceRecord {
  const fields: SourceField[] = [];
  const identifiers: Identifier[] = [];
  const add = (field: SourceField["field"], value: string | null | undefined) => {
    if (value?.trim()) fields.push({ field, value: value.trim() });
  };

  add("A1", user.name);
  add("A5", user.avatar_url);
  add("B1", user.email);
  add("C1", user.location);
  // "@exemple-sa" is the GitHub handle of the company.
  add("E1", user.company?.replace(/^@/, ""));
  for (const repo of repos) add("E3", repo);
  add("F1", user.login);
  add("F1", user.twitter_username);
  add("F2", user.html_url);
  add("F3", user.blog);

  identifiers.push({ type: "PSEUDO", value: user.login });
  if (user.twitter_username) identifiers.push({ type: "PSEUDO", value: user.twitter_username });
  if (user.email) identifiers.push({ type: "EMAIL", value: user.email });
  const domain = user.blog ? hostnameOf(user.blog) : null;
  if (domain) identifiers.push({ type: "DOMAINE", value: domain });
  return { about: "subject", fields, identifiers };
}

/** Commits whose email is not linked to an account still give the author names and repositories. */
function unlinkedRecord(commits: GithubCommits): SourceRecord | null {
  const items = commits.items.filter((i) => linkedLogin(i) === null);
  if (items.length === 0) return null;
  const names = [...new Set(items.map((i) => i.commit.author?.name).filter((n): n is string => !!n))];
  const fields: SourceField[] = [
    ...names.map((value) => ({ field: "A1" as const, value })),
    ...repositories(commits, null).map((value) => ({ field: "E3" as const, value })),
  ];
  return { about: "subject", fields, identifiers: [] };
}

export function toRecords(commits: GithubCommits | null, users: GithubUser[]): SourceRecord[] {
  const records = users.map((user) => userRecord(user, repositories(commits, user.login)));
  const unlinked = commits ? unlinkedRecord(commits) : null;
  return unlinked ? [...records, unlinked] : records;
}
