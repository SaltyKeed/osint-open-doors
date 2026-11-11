import "server-only";
import { collectPivots } from "@/server/domain/pivots";
import type { Finding, SearchQuery } from "@/server/domain/types";
import { archivedXProfile } from "@/server/providers/wayback";
import { checkUsernames } from "@/server/providers/whatsmyname";

// Pivot step (rebond), one level only: the usernames found in results linked to
// the visitor (GitHub, Gravatar, verified pages) are checked on every site of the
// WhatsMyName list, and their old X profile is looked up in the web archive.
export async function pivot(findings: Finding[], query: SearchQuery, signal: AbortSignal): Promise<Finding[]> {
  const targets = collectPivots(findings, query);
  if (targets.length === 0) return [];

  const [profiles, archives] = await Promise.all([
    checkUsernames(targets, signal).catch(() => []),
    Promise.all(targets.map((t) => archivedXProfile(t.username, t.origin, signal).catch(() => []))),
  ]);
  return [...profiles, ...archives.flat()];
}
