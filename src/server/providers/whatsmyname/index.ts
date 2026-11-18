import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { Source, SourceInspection, SourceRecord } from "@/server/domain/source";
import { checkSite, profileUrl, usableSites, type SiteResult } from "./check";
import { wmnDataSchema } from "./schema";
// Frozen copy of WhatsMyName (archived on 2026-11-09), CC BY-SA 4.0, Micah Hoffman and contributors.
import data from "./wmn-data.json";

/** Sites checked at the same time: fast, without looking like an attack on one network. */
const CONCURRENCY = 30;

/** The list is checked once, when the server starts: a broken copy stops it with a clear error. */
export const WMN_SITES = usableSites(wmnDataSchema.parse(data).sites);

async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
  if (input.type !== "PSEUDO") return { raw: null, parsed: null, records: [] };
  const results: { site: string; result: SiteResult }[] = [];
  const records: SourceRecord[] = [];
  const queue = [...WMN_SITES];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let site = queue.shift(); site && !signal.aborted; site = queue.shift()) {
        const result = await checkSite(site, input.value, signal);
        results.push({ site: site.name, result });
        // Only the address: the profile is never read, and it does not start a new search (T7).
        if (result === "found") {
          records.push({ about: "subject", fields: [{ field: "F2", value: profileUrl(site, input.value) }], identifiers: [] });
        }
      }
    }),
  );
  if (signal.aborted) throw signal.reason;
  // For the /dev console: the verdict of every site, never a page.
  return { raw: results, parsed: results, records };
}

export const whatsMyName: Source = {
  id: "whatsmyname",
  accepts: ["PSEUDO"],
  sitesChecked: WMN_SITES.length,
  callTimeoutMs: 25_000,
  inspect,
  investigate: async (input, signal) => (await inspect(input, signal)).records,
};
