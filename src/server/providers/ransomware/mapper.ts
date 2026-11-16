import "server-only";
import { z } from "zod";
import type { AccountFinding } from "@/server/domain/types";

export const PROVIDER_ID = "ransomware";

// Shape of GET api.ransomware.live/v2/searchvictims/<keyword> (fields we use). The
// answer also holds the ransom note and a link to the leak site: they are not in the
// schema, so they never reach the screen.
export const victimsSchema = z.array(
  z.object({
    victim: z.string(),
    domain: z.string().default(""),
    group: z.string().default(""),
    attackdate: z.string().default(""),
    discovered: z.string().default(""),
  }),
);

const bare = (domain: string) => domain.trim().toLowerCase().replace(/^www\./, "");

// The search is by keyword and returns unrelated victims: only those whose website is
// exactly the domain of the visitor's email are kept.
export function toFindings(raw: unknown, domain: string): AccountFinding[] {
  const parsed = victimsSchema.safeParse(raw);
  if (!parsed.success) return [];
  const victims = parsed.data.filter((v) => v.domain !== "" && bare(v.domain) === bare(domain));
  return victims.map((v) => {
    const date = (v.attackdate || v.discovered).slice(0, 7);
    const [year, month] = date.split("-");
    const when = year && month ? `${month}.${year}` : "date inconnue";
    return {
      kind: "account",
      providerId: PROVIDER_ID,
      service: "Attaque par rançongiciel",
      summary:
        `L'organisation du domaine ${bare(domain)} (${v.victim}) a été revendiquée comme victime par le groupe ` +
        `${v.group || "inconnu"} (${when}). Les données volées sont souvent publiées : celles des employés, ` +
        "élèves ou clients peuvent en faire partie. Une revendication n'est pas toujours confirmée.",
      categories: ["other"],
      matchedOn: "email",
    };
  });
}
