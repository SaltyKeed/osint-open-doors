import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { SourceField, Source, SourceInspection, SourceRecord } from "@/server/domain/source";
import { displayName, type OgTags } from "../og-tags";
import { checkSite, profileUrl, usableSites, type SiteResult } from "./check";
import { wmnDataSchema } from "./schema";
// Frozen copy of WhatsMyName (archived on 2026-11-09), CC BY-SA 4.0, Micah Hoffman and contributors.
import data from "./wmn-data.json";

/** Sites checked at the same time: fast, without looking like an attack on one network. */
const CONCURRENCY = 30;

/** The list is checked once, when the server starts: a broken copy stops it with a clear error. */
export const WMN_SITES = usableSites(wmnDataSchema.parse(data).sites);

function hostnameOf(address: string): string | null {
  try {
    return new URL(address.replace("{account}", "x")).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Hosts of the sites of the list (T10): the only ones the profile page source may open. */
export const WMN_HOSTS: ReadonlySet<string> = new Set(
  WMN_SITES.flatMap((s) => [s.uri_check, s.uri_pretty ?? s.uri_check]).flatMap((a) => hostnameOf(a) ?? []),
);

/** Sites that give each account its own subdomain (`{account}.exemple.ch`): the suffix, with its dot. */
const WMN_SUBDOMAIN_SUFFIXES: readonly string[] = [
  ...new Set(
    WMN_SITES.flatMap((s) => [s.uri_check, s.uri_pretty ?? s.uri_check]).flatMap((address) => {
      // Read on the template, not on the address with "x": a real site called x.com is not a template.
      const suffix = /^https?:\/\/\{account\}(\.[a-z0-9.-]+)(?:[/:?#]|$)/i.exec(address)?.[1];
      return suffix ? [suffix.toLowerCase()] : [];
    }),
  ),
];

/** True for a host of the list, or for one subdomain of a site that gives each account its own. */
export function isWmnHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (WMN_HOSTS.has(host)) return true;
  return WMN_SUBDOMAIN_SUFFIXES.some((suffix) => host.endsWith(suffix) && !host.slice(0, -suffix.length).includes("."));
}

/** The account address, plus the name and photo of the page when it publishes them (T10). */
function accountFields(address: string, og: OgTags): SourceField[] {
  // The page title often adds the site name to the person's name: only the name is kept.
  const name = og.title ? displayName(og.title) : undefined;
  const profile = { ...(name && { name }), ...(og.image && { photo: og.image }) };
  return [
    { field: "F2", value: address, ...(Object.keys(profile).length > 0 && { profile }) },
    ...(name ? [{ field: "A1" as const, value: name }] : []),
    ...(og.image ? [{ field: "A5" as const, value: og.image }] : []),
  ];
}

async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
  if (input.type !== "PSEUDO") return { raw: null, parsed: null, records: [] };
  const results: { site: string; result: SiteResult; og?: OgTags }[] = [];
  const records: SourceRecord[] = [];
  const queue = [...WMN_SITES];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let site = queue.shift(); site && !signal.aborted; site = queue.shift()) {
        const { result, og } = await checkSite(site, input.value, signal);
        // The tags are kept for the dev console only for an account found.
        results.push({ site: site.name, result, ...(result === "found" && { og }) });
        // Address, displayed name and photo: nothing else of the page, and no new search (T7, T10).
        if (result === "found") {
          records.push({ about: "subject", fields: accountFields(profileUrl(site, input.value), og), identifiers: [] });
        }
      }
    }),
  );
  if (signal.aborted) throw signal.reason;
  // For the /dev console: the verdict of every site and the og tags of the accounts found, never a page.
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
