import "server-only";
import { found, type Source, type SourceRecord } from "@/server/domain/source";
import { toPlatformRecord } from "../profiles/record";
import { evaluate, prepareUsername, profileUrl, sortSites } from "./mapper";
import { loadSites, type WmnSite } from "./sites";

const CONCURRENCY = 60;
const PER_SITE_TIMEOUT_MS = 5000;
/** Own deadline, shorter than the engine timeout: the accounts found so far are kept. */
const DEADLINE_MS = 14_000;
const USER_AGENT = "Mozilla/5.0 (compatible; osint-open-doors; school awareness project)";

async function check(site: WmnSite, username: string, signal: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(profileUrl(site.uri_check, prepareUsername(site, username)), {
      signal: AbortSignal.any([signal, AbortSignal.timeout(PER_SITE_TIMEOUT_MS)]),
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, ...site.headers },
    });
    return evaluate(site, response.status, await response.text()) === "found";
  } catch {
    return false;
  }
}

// Does an account with this pseudo exist on about 600 sites? (SOURCES.md, 3.1)
export const whatsMyName: Source = {
  id: "whatsmyname",
  label: "WhatsMyName (600 sites)",
  accepts: ["PSEUDO"],
  requiredEnv: [],
  async run(pseudo, { signal }) {
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(DEADLINE_MS)]);
    const sites = sortSites(loadSites());
    const records: SourceRecord[] = [];
    let next = 0;
    async function worker() {
      while (next < sites.length && !deadline.aborted) {
        const site = sites[next++];
        if (!site) break;
        if (await check(site, pseudo.value, deadline)) {
          const username = prepareUsername(site, pseudo.value);
          const url = profileUrl(site.uri_pretty ?? site.uri_check, username);
          records.push(toPlatformRecord({ site: site.name, category: site.cat, url, details: [] }, pseudo));
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return found(records);
  },
};
