import "server-only";
import type { ProfileFinding } from "@/server/domain/types";
import type { BreachProvider } from "../types";
import { PROVIDER_ID, evaluate, prepareUsername, profileUrl, selectSites } from "./mapper";
import { datasetSchema, siteSchema, type WmnSite } from "./schema";

const DATASET_URL = "https://raw.githubusercontent.com/WebBreacher/WhatsMyName/main/wmn-data.json";
const CONCURRENCY = 80;
const PER_SITE_TIMEOUT_MS = 5000;
const USER_AGENT = "Mozilla/5.0 (compatible; osint-open-doors; school awareness project)";

// The list of sites is public data (no personal data): kept in memory between searches.
let sitesPromise: Promise<WmnSite[]> | undefined;

function loadSites(): Promise<WmnSite[]> {
  sitesPromise ??= fetch(DATASET_URL, { cache: "no-store" })
    .then((r) => r.json())
    .then((raw) => {
      const dataset = datasetSchema.parse(raw);
      const sites = dataset.sites.flatMap((s) => {
        const parsed = siteSchema.safeParse(s);
        return parsed.success ? [parsed.data] : [];
      });
      return selectSites(sites);
    })
    .catch((error: unknown) => {
      sitesPromise = undefined; // retry on the next search
      throw error;
    });
  return sitesPromise;
}

async function checkSite(site: WmnSite, username: string, signal: AbortSignal): Promise<boolean> {
  const url = profileUrl(site.uri_check, prepareUsername(site, username));
  try {
    const response = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(PER_SITE_TIMEOUT_MS)]),
      cache: "no-store",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, ...site.headers },
    });
    const body = await response.text();
    return evaluate(site, response.status, body) === "found";
  } catch {
    return false;
  }
}

// Checks usernames on every site, all in one queue. Stops when the signal ends and
// returns the accounts found so far (partial result rather than nothing).
export async function checkUsernames(
  targets: { username: string; origin: string }[],
  signal: AbortSignal,
): Promise<ProfileFinding[]> {
  if (targets.length === 0) return [];
  const sites = await loadSites();
  const jobs = targets.flatMap((target) => sites.map((site) => ({ ...target, site })));
  const found: ProfileFinding[] = [];
  let next = 0;

  async function worker() {
    while (next < jobs.length && !signal.aborted) {
      const job = jobs[next++];
      if (!job) break;
      if (await checkSite(job.site, job.username, signal)) {
        found.push({
          kind: "profile",
          providerId: PROVIDER_ID,
          site: job.site.name,
          category: job.site.cat,
          url: profileUrl(job.site.uri_pretty ?? job.site.uri_check, prepareUsername(job.site, job.username)),
          username: job.username,
          origin: job.origin,
          matchedOn: "username",
        });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return found;
}

export const whatsMyName: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["username"],
  async search(query, signal) {
    if (!query.username) return [];
    // Own deadline slightly shorter than the provider timeout, to keep the partial result.
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(11000)]);
    return checkUsernames([{ username: query.username, origin: "pseudo" }], deadline);
  },
};
