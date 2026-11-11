import "server-only";
import { z } from "zod";
import { containsFullName } from "@/server/domain/matching";
import type { SearchQuery, WebFinding } from "@/server/domain/types";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";

const PROVIDER_ID = "wikidata";

// Shape of GET https://www.wikidata.org/w/api.php?action=wbsearchentities (fields we use).
const searchSchema = z.object({
  search: z
    .array(z.object({ id: z.string(), label: z.string().nullish(), description: z.string().nullish() }))
    .optional(),
});

// Notable people with this exact name (name only: not verified, D17).
export function toFindings(raw: unknown, query: SearchQuery): WebFinding[] {
  const parsed = searchSchema.safeParse(raw);
  const { firstName, lastName } = query;
  if (!parsed.success || !firstName || !lastName) return [];
  return (parsed.data.search ?? [])
    .filter((r) => containsFullName(r.label ?? "", firstName, lastName))
    .map((r) => ({
      kind: "web",
      providerId: PROVIDER_ID,
      verified: false,
      probable: false,
      site: "wikidata.org",
      url: `https://www.wikidata.org/wiki/${r.id}`,
      title: `${r.label ?? ""} — fiche Wikidata`,
      snippet: r.description ?? "",
      matchedOn: "name",
    }));
}

export const wikidata: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["name"],
  async search(query, signal) {
    if (!query.firstName || !query.lastName) return [];
    const params = new URLSearchParams({
      action: "wbsearchentities",
      search: `${query.firstName} ${query.lastName}`,
      language: "fr",
      uselang: "fr",
      format: "json",
      limit: "10",
      type: "item",
    });
    const headers = { "User-Agent": "osint-open-doors (school awareness project)" };
    const response = await providerFetch(PROVIDER_ID, `https://www.wikidata.org/w/api.php?${params}`, signal, { headers });
    const raw: unknown = await response.json().catch(() => null);
    if (raw === null) throw new ProviderError(PROVIDER_ID, "invalid-response");
    return toFindings(raw, query);
  },
};
