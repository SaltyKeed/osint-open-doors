import "server-only";
import { collectPivots } from "@/server/domain/pivots";
import type { Finding, SearchQuery } from "@/server/domain/types";
import { generateUsernames } from "@/server/domain/usernames";
import { keybaseLookup } from "@/server/providers/keybase";
import { lookupProfiles } from "@/server/providers/profiles";
import { archivedXProfile } from "@/server/providers/wayback";
import { checkUsernames } from "@/server/providers/whatsmyname";

const GUESSED_ORIGIN = "deviné à partir de ton nom";

// Pivot step (rebond), one level only: the usernames found in results linked to
// the visitor (part of the email before the @, GitHub, Gravatar, verified pages)
// are checked on every site of the WhatsMyName list, on Keybase and on the public
// profile APIs (D24), and their old X profile is looked up in the web archive.
// Usernames guessed from the name (D28) are checked on the social networks of the
// list and on the public profile APIs only: 6 guesses x 650 sites would not fit in time.
export async function pivot(findings: Finding[], query: SearchQuery, signal: AbortSignal): Promise<Finding[]> {
  const targets = collectPivots(findings, query);
  const taken = new Set(targets.map((t) => t.username.toLowerCase()));
  const guessed = generateUsernames(query)
    .filter((u) => !taken.has(u))
    .map((username) => ({ username, origin: GUESSED_ORIGIN, categories: ["social"], guessed: true }));
  // The typed username also gets its Keybase lookup (WhatsMyName already ran on it).
  const typed = query.username ? keybaseLookup(query.username, "pseudo", signal) : Promise.resolve([]);

  const [typedKeybase, profiles, archives, keybase, publicProfiles, guessedProfiles] = await Promise.all([
    typed,
    // Real pivots first in the queue: they are more likely to be the visitor.
    checkUsernames([...targets, ...guessed], signal).catch(() => []),
    Promise.all(targets.map((t) => archivedXProfile(t.username, t.origin, signal).catch(() => []))),
    Promise.all(targets.map((t) => keybaseLookup(t.username, t.origin, signal))),
    Promise.all(targets.map((t) => lookupProfiles(t.username, t.origin, signal))),
    Promise.all(guessed.map((g) => lookupProfiles(g.username, g.origin, signal))),
  ]);
  return [
    ...typedKeybase,
    ...profiles,
    ...archives.flat(),
    ...keybase.flat(),
    ...publicProfiles.flat(),
    ...guessedProfiles.flat().map((p) => ({ ...p, guessed: true })),
  ];
}
