import "server-only";
import { found, type Source, type SourceRecord } from "@/server/domain/source";
import { toPlatformRecord } from "./record";
import { PROFILE_SITES, parseBody, type ProfileSite } from "./sites";

const PER_SITE_TIMEOUT_MS = 6000;
const USER_AGENT = "osint-open-doors (school awareness project)";

async function lookup(site: ProfileSite, username: string, signal: AbortSignal) {
  try {
    const response = await fetch(site.apiUrl(username), {
      signal: AbortSignal.any([signal, AbortSignal.timeout(PER_SITE_TIMEOUT_MS)]),
      headers: { "User-Agent": USER_AGENT, Accept: site.format === "xml" ? "application/xml" : "application/json" },
    });
    // 404, 400, 204 or a rate limit (429): no account found.
    if (response.status !== 200) return null;
    return site.read(parseBody(await response.text(), site.format), username);
  } catch {
    return null;
  }
}

// Public profile APIs of 16 platforms (SOURCES.md, 3.2), taken from the first
// prototype: they give facts (creation year, country, activity) and not just
// "the page exists". Only these neutral facts are kept.
export const platformProfiles: Source = {
  id: "profiles",
  label: "API des plateformes (Chess.com, Steam, Reddit…)",
  accepts: ["PSEUDO"],
  requiredEnv: [],
  async run(pseudo, { signal }) {
    const results = await Promise.all(
      PROFILE_SITES.map(async (site): Promise<SourceRecord | null> => {
        const facts = await lookup(site, pseudo.value, signal);
        return facts ? toPlatformRecord({ site: site.site, category: site.category, ...facts }, pseudo) : null;
      }),
    );
    return found(results.filter((r): r is SourceRecord => r !== null));
  },
};
