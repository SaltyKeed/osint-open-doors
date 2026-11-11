import { handleFromProfileUrl, isUsableHandle } from "./handles";
import type { Finding, SearchQuery } from "./types";

export type Pivot = { username: string; origin: string };

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
