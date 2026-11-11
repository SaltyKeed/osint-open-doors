import "server-only";
import type { AccountFinding, DataCategory } from "@/server/domain/types";
import type { CommitSearch } from "./schema";

export const PROVIDER_ID = "github";

// Only commits whose author email is exactly the visitor's are counted.
// Repository names and logins are counted, never displayed.
export function toFindings(search: CommitSearch, email: string): AccountFinding[] {
  const own = search.items.filter((item) => item.commit.author?.email.toLowerCase() === email.toLowerCase());
  if (own.length === 0) return [];

  const repositories = new Set(own.map((item) => item.repository.full_name)).size;
  const hasAccount = own.some((item) => item.author !== null);
  const categories: DataCategory[] = ["email", "name"];
  if (hasAccount) categories.push("username");

  const commits = search.total_count;
  return [
    {
      kind: "account",
      providerId: PROVIDER_ID,
      service: "GitHub",
      summary:
        `${commits} commit${commits > 1 ? "s" : ""} public${commits > 1 ? "s" : ""} signé${commits > 1 ? "s" : ""} avec ton adresse` +
        ` (au moins ${repositories} dépôt${repositories > 1 ? "s" : ""}).` +
        (hasAccount ? " Ils sont reliés à un compte GitHub." : "") +
        " Chaque commit publie aussi le nom configuré dans Git.",
      categories,
      matchedOn: "email",
    },
  ];
}
