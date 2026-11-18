import "server-only";
import { z } from "zod";
import type { Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";

// The answer also holds the ransom note and a link to the leak site: they are not
// in the schema, so they never reach the screen.
const victimsSchema = z.array(
  z.object({
    victim: z.string(),
    domain: z.string().default(""),
    group: z.string().default(""),
    attackdate: z.string().default(""),
    discovered: z.string().default(""),
  }),
);

const bare = (domain: string) => domain.trim().toLowerCase().replace(/^www\./, "");

/** The search is by keyword: only victims whose website is exactly the domain are kept. */
export function toRansomRecords(raw: unknown, domain: Identifier): SourceRecord[] {
  const parsed = victimsSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data
    .filter((v) => v.domain !== "" && bare(v.domain) === bare(domain.value))
    .map((v) => {
      const [year, month] = (v.attackdate || v.discovered).slice(0, 7).split("-");
      return {
        origin: `ransomware:${v.victim}`,
        evidence: null,
        values: [
          {
            field: "H1",
            value: `Rançongiciel : ${v.victim}`,
            attributes: [
              { label: "Groupe", value: v.group || "inconnu", known: true },
              { label: "Date", value: year && month ? `${month}.${year}` : "inconnue", known: true },
              {
                label: "Ce que ça veut dire",
                value: "L'organisation de ce domaine a été revendiquée comme victime. Les données des employés, élèves ou clients sont souvent publiées. Une revendication n'est pas toujours confirmée.",
                known: true,
              },
            ],
          },
        ],
        identifiers: [{ identifier: domain }],
      };
    });
}

// ransomware.live (SOURCES.md, section 1.1): victims claimed by ransomware groups.
// Only the domain is sent, never the email.
export const ransomwareLive: Source = {
  id: "ransomware",
  label: "ransomware.live",
  accepts: ["DOMAINE"],
  requiredEnv: [],
  async run(domain, { signal }) {
    const keyword = domain.value.split(".").slice(-2, -1)[0];
    if (!keyword || keyword.length < 3) return found([]);
    const response = await fetch(`https://api.ransomware.live/v2/searchvictims/${encodeURIComponent(keyword)}`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) return found([]);
    if (!response.ok) throw new Error(`ransomware: HTTP ${response.status}`);
    return found(toRansomRecords(await response.json().catch(() => null), domain));
  },
};
