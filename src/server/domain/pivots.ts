import { handleFromProfileUrl, isUsableHandle } from "./handles";
import type { Finding, SearchQuery } from "./types";

export type Pivot = { username: string; origin: string };

// Shared mailbox names: they say nothing about a person.
const GENERIC_LOCAL_PARTS = new Set([
  "info", "contact", "admin", "test", "mail", "hello", "bonjour", "office", "support", "noreply",
  "no-reply", "secretariat", "direction", "sales", "team", "webmaster",
]);

// The part before the @ is often reused as a username (D20).
export function emailLocalPart(email: string | undefined): string | null {
  const local = email?.split("@")[0]?.split("+")[0];
  if (!local || GENERIC_LOCAL_PARTS.has(local.toLowerCase()) || !isUsableHandle(local)) return null;
  return local;
}

// Pivot step (rebond): usernames found in results that are surely about the visitor
// (accounts linked to the email, verified pages). Unverified pages (name only) are
// never used: they may belong to a homonym. Duplicates are ignored (case-insensitive).
export function collectPivots(findings: Finding[], query: SearchQuery, limit = 3): Pivot[] {
  const seen = new Set<string>(query.username ? [query.username.toLowerCase()] : []);
  const pivots: Pivot[] = [];

  const add = (username: string, origin: string) => {
    const key = username.toLowerCase();
    if (!isUsableHandle(username) || seen.has(key)) return;
    seen.add(key);
    pivots.push({ username, origin });
  };

  const local = emailLocalPart(query.email);
  if (local) add(local, "la partie de ton email avant le @");

  for (const finding of findings) {
    if (finding.kind === "account") {
      for (const handle of finding.handles ?? []) add(handle, finding.service);
    } else if (finding.kind === "web" && finding.verified) {
      const handle = handleFromProfileUrl(finding.url);
      if (handle) add(handle, finding.site);
    }
  }

  return pivots.slice(0, limit);
}
