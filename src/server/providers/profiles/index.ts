import "server-only";
import type { ProfileFinding } from "@/server/domain/types";
import type { BreachProvider } from "../types";
import { PROFILE_SITES, type ProfileSite, parseBody } from "./sites";

export const PROVIDER_ID = "profiles";
const PER_SITE_TIMEOUT_MS = 6000;
const USER_AGENT = "osint-open-doors (school awareness project)";

async function lookup(site: ProfileSite, username: string, origin: string, signal: AbortSignal): Promise<ProfileFinding | null> {
  try {
    const response = await fetch(site.apiUrl(username), {
      signal: AbortSignal.any([signal, AbortSignal.timeout(PER_SITE_TIMEOUT_MS)]),
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT, Accept: site.format === "xml" ? "application/xml" : "application/json" },
    });
    // 404, 400, 204 or a rate limit (429): treated as "no account found".
    if (response.status !== 200) return null;
    const facts = site.read(parseBody(await response.text(), site.format), username);
    if (!facts) return null;
    return {
      kind: "profile",
      providerId: PROVIDER_ID,
      site: site.site,
      category: site.category,
      url: facts.url,
      username,
      origin,
      details: facts.details,
      matchedOn: "username",
    };
  } catch {
    return null;
  }
}

// Every site in parallel; a failing site is simply left out.
export async function lookupProfiles(username: string, origin: string, signal: AbortSignal): Promise<ProfileFinding[]> {
  const results = await Promise.all(PROFILE_SITES.map((site) => lookup(site, username, origin, signal)));
  return results.filter((r): r is ProfileFinding => r !== null);
}

// The typed username; usernames found by the pivot step are checked in pivot.ts.
export const publicProfiles: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["username"],
  async search(query, signal) {
    return query.username ? lookupProfiles(query.username, "pseudo", signal) : [];
  },
};
