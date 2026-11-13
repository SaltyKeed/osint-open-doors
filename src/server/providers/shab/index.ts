import "server-only";
import type { WebFinding } from "@/server/domain/types";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";
import { PROVIDER_ID, toFindings } from "./mapper";

const MAX_RESULTS = 10;

async function searchPhrase(phrase: string, signal: AbortSignal): Promise<WebFinding[]> {
  const params = new URLSearchParams({
    keyword: `"${phrase}"`,
    rubrics: "HR",
    publicationStates: "PUBLISHED",
    "pageRequest.size": String(MAX_RESULTS),
  });
  const url = `https://amtsblattportal.ch/api/v1/publications?${params}`;
  const response = await providerFetch(PROVIDER_ID, url, signal, { headers: { Accept: "application/json" } });
  const raw: unknown = await response.json().catch(() => null);
  if (raw === null) throw new ProviderError(PROVIDER_ID, "invalid-response");
  return toFindings(raw);
}

// Swiss Official Gazette of Commerce (FOSC/SHAB), open data from SECO (D24).
// The register writes people as "Nom, Prénom": both orders are searched as exact phrases.
export const shab: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["name"],
  async search(query, signal) {
    const { firstName, lastName } = query;
    if (!firstName || !lastName) return [];
    const [registerOrder, naturalOrder] = await Promise.all([
      searchPhrase(`${lastName}, ${firstName}`, signal),
      searchPhrase(`${firstName} ${lastName}`, signal),
    ]);
    const seen = new Set<string>();
    return [...registerOrder, ...naturalOrder].filter((f) => !seen.has(f.url) && seen.add(f.url)).slice(0, MAX_RESULTS);
  },
};
