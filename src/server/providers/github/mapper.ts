import "server-only";
import type { AccountFinding, DataCategory } from "@/server/domain/types";
import type { CommitSearch, GitHubUser } from "./schema";

export const PROVIDER_ID = "github";

// Technical GitHub accounts: not a person, never used as a pivot.
const TECHNICAL_LOGINS = new Set(["invalid-email-address", "web-flow", "actions-user", "ghost"]);

function isPersonLogin(login: string): boolean {
  return !TECHNICAL_LOGINS.has(login.toLowerCase()) && !login.endsWith("[bot]");
}

// Logins of the accounts that signed commits with exactly this email.
export function ownLogins(search: CommitSearch, email: string): string[] {
  const own = search.items.filter((item) => item.commit.author?.email.toLowerCase() === email.toLowerCase());
  const logins = own.flatMap((item) => (item.author && isPersonLogin(item.author.login) ? [item.author.login] : []));
  return [...new Set(logins)];
}

// Only commits whose author email is exactly the visitor's are counted.
export function toFindings(search: CommitSearch, email: string): AccountFinding[] {
  const own = search.items.filter((item) => item.commit.author?.email.toLowerCase() === email.toLowerCase());
  if (own.length === 0) return [];

  const repositories = new Set(own.map((item) => item.repository.full_name)).size;
  const logins = ownLogins(search, email);
  const categories: DataCategory[] = ["email", "name"];
  if (logins.length > 0) categories.push("username");

  const commits = search.total_count;
  return [
    {
      kind: "account",
      providerId: PROVIDER_ID,
      service: "GitHub",
      summary:
        `${commits} commit${commits > 1 ? "s" : ""} public${commits > 1 ? "s" : ""} signé${commits > 1 ? "s" : ""} avec ton adresse` +
        ` (au moins ${repositories} dépôt${repositories > 1 ? "s" : ""}).` +
        (logins.length > 0 ? ` Ils sont reliés au compte @${logins.join(", @")}.` : "") +
        " Chaque commit publie aussi le nom configuré dans Git.",
      categories,
      matchedOn: "email",
      handles: logins,
    },
  ];
}

// Public profile of the account linked by the commits.
export function toProfileFinding(user: GitHubUser): AccountFinding {
  const visible: string[] = [];
  const categories: DataCategory[] = ["username"];
  if (user.name) {
    visible.push("ton nom");
    categories.push("name");
  }
  if (user.location) {
    visible.push(`ta localité (${user.location})`);
    categories.push("location");
  }
  if (user.company) visible.push(`ton entreprise ou école (${user.company})`);
  if (user.blog) visible.push(`un site perso (${user.blog})`);
  if (user.twitter_username) visible.push(`ton compte X @${user.twitter_username}`);
  if (user.bio) visible.push("une bio");

  const since = user.created_at?.slice(0, 4);
  return {
    kind: "account",
    providerId: PROVIDER_ID,
    service: `Profil GitHub @${user.login}`,
    summary:
      (visible.length > 0 ? `Le profil public montre ${visible.join(", ")}.` : "Le profil public ne montre presque rien.") +
      (since ? ` Compte créé en ${since}` : "") +
      (user.public_repos !== undefined ? `, ${user.public_repos} dépôt${user.public_repos > 1 ? "s" : ""} public${user.public_repos > 1 ? "s" : ""}.` : "."),
    categories,
    matchedOn: "email",
    handles: [user.login, ...(user.twitter_username ? [user.twitter_username] : [])],
  };
}
