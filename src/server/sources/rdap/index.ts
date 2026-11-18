import "server-only";
import { z } from "zod";
import type { FoundValue } from "@/server/domain/fiche";
import type { Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";

const rdapSchema = z.object({
  events: z.array(z.object({ eventAction: z.string(), eventDate: z.string().optional() })).optional(),
  entities: z.array(z.object({ roles: z.array(z.string()).optional(), vcardArray: z.unknown() })).optional(),
});

function vcardName(vcard: unknown): string | undefined {
  if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) return undefined;
  const fn = (vcard[1] as unknown[]).find((field) => Array.isArray(field) && field[0] === "fn");
  return Array.isArray(fn) && typeof fn[3] === "string" ? fn[3] : undefined;
}

/** Registration year, and the holder's name only when the public register shows it. */
export function toRdapRecord(raw: unknown, domain: Identifier): SourceRecord {
  const parsed = rdapSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};
  const year = data.events?.find((e) => e.eventAction === "registration")?.eventDate?.slice(0, 4);
  const holder = vcardName(data.entities?.find((e) => e.roles?.includes("registrant"))?.vcardArray)?.trim();
  const publicHolder = holder && !/redact|privacy|private|withheld|data protected/i.test(holder) ? holder : null;
  const values: FoundValue[] = [
    { field: "F3", value: domain.value, attributes: year ? [{ label: "Enregistré en", value: year, known: true }] : [] },
    ...(publicHolder ? [{ field: "A1" as const, value: publicHolder }] : []),
  ];
  return { origin: "RDAP", evidence: rdapUrl(domain.value), values, identifiers: [{ identifier: domain }] };
}

/** rdap.org does not know .ch and .li domains: their registry (SWITCH) has its own server. */
export function rdapUrl(domain: string): string {
  const base = /\.(ch|li)$/.test(domain) ? "https://rdap.nic.ch" : "https://rdap.org";
  return `${base}/domain/${encodeURIComponent(domain)}`;
}

// Public register of domain names (SOURCES.md, section 7).
export const rdap: Source = {
  id: "rdap",
  label: "RDAP (registre des domaines)",
  accepts: ["DOMAINE"],
  requiredEnv: [],
  async run(domain, { signal }) {
    // rdap.org refuses requests without a User-Agent (403).
    const response = await fetch(rdapUrl(domain.value), {
      signal,
      headers: { "User-Agent": "osint-open-doors (school awareness project)", Accept: "application/rdap+json" },
    });
    if (response.status === 404) return found([]);
    if (!response.ok) throw new Error(`rdap: HTTP ${response.status}`);
    return found([toRdapRecord(await response.json(), domain)]);
  },
};
