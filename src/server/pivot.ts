import "server-only";
import { collectPivots } from "@/server/domain/pivots";
import type { Finding, SearchQuery } from "@/server/domain/types";
import { keybaseLookup } from "@/server/providers/keybase";
import { archivedXProfile } from "@/server/providers/wayback";
import { checkUsernames } from "@/server/providers/whatsmyname";

// Pivot step (rebond), one level only: the usernames found in results linked to
// the visitor (part of the email before the @, GitHub, Gravatar, verified pages)
// are checked on every site of the WhatsMyName list, on Keybase, and their old
// X profile is looked up in the web archive.
export async function pivot(findings: Finding[], query: SearchQuery, signal: AbortSignal): Promise<Finding[]> {
  const targets = collectPivots(findings, query);
  // The typed username also gets its Keybase lookup (WhatsMyName already ran on it).
  const typed = query.username ? keybaseLookup(query.username, "pseudo", signal) : Promise.resolve([]);

  const [typedKeybase, profiles, archives, keybase] = await Promise.all([
    typed,
    checkUsernames(targets, signal).catch(() => []),
    Promise.all(targets.map((t) => archivedXProfile(t.username, t.origin, signal).catch(() => []))),
    Promise.all(targets.map((t) => keybaseLookup(t.username, t.origin, signal))),
  ]);
  return [...typedKeybase, ...profiles, ...archives.flat(), ...keybase.flat()];
}
