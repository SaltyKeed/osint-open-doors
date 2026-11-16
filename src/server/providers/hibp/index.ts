import "server-only";
import type { Finding } from "@/server/domain/types";
import { providerFetch } from "../http";
import { type CatalogEntry, catalogSchema, enrichBreaches, indexCatalog } from "./mapper";

const PROVIDER_ID = "hibp";
const CATALOG_URL = "https://haveibeenpwned.com/api/v3/breaches";
// The catalog changes a few times a week: one download per day is enough.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
// About 1 MB: it gets its own time limit, independent of the search steps.
const DOWNLOAD_TIMEOUT_MS = 15000;

type Index = Map<string, CatalogEntry>;

// Kept in memory: it is a public list of breaches, it holds no personal data.
let cache: { index: Index; at: number } | undefined;
let inFlight: Promise<Index> | undefined;

async function download(): Promise<Index> {
  const headers = { "User-Agent": "osint-open-doors (school awareness project)", Accept: "application/json" };
  const signal = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS);
  const response = await providerFetch(PROVIDER_ID, CATALOG_URL, signal, { headers });
  const parsed = catalogSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error(`[${PROVIDER_ID}] invalid catalog`);
  cache = { index: indexCatalog(parsed.data), at: Date.now() };
  return cache.index;
}

function loadIndex(): Promise<Index> {
  if (cache && Date.now() - cache.at < MAX_AGE_MS) return Promise.resolve(cache.index);
  inFlight ??= download().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

// Called at the start of a search, so that the download runs while the sources answer.
export function warmCatalog(): void {
  loadIndex().catch(() => console.error(`[search] provider=${PROVIDER_ID} status=catalog-unavailable`));
}

// Second step (D29): describes the breaches found by the other sources. If the catalog
// is not there in time, the results are returned unchanged.
export async function describeBreaches(findings: Finding[], signal: AbortSignal): Promise<Finding[]> {
  if (!findings.some((f) => f.kind === "breach")) return findings;
  const aborted = new Promise<never>((_, reject) => {
    if (signal.aborted) reject(new Error("aborted"));
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
  try {
    return enrichBreaches(findings, await Promise.race([loadIndex(), aborted]));
  } catch {
    console.error(`[search] provider=${PROVIDER_ID} status=catalog-unavailable`);
    return findings;
  }
}
