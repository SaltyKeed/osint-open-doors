import "server-only";
import { z } from "zod";
import { containsFullName } from "@/server/domain/matching";
import type { SearchQuery, WebFinding } from "@/server/domain/types";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";

const PROVIDER_ID = "orcid";

// Shape of GET https://pub.orcid.org/v3.0/expanded-search (fields we use).
const searchSchema = z.object({
  "expanded-result": z
    .array(
      z.object({
        "orcid-id": z.string(),
        "given-names": z.string().nullish(),
        "family-names": z.string().nullish(),
        "institution-name": z.array(z.string()).nullish(),
      }),
    )
    .nullish(),
});

// Researchers registered with exactly this first and last name (name only: not verified, D15).
export function toFindings(raw: unknown, query: SearchQuery): WebFinding[] {
  const parsed = searchSchema.safeParse(raw);
  const { firstName, lastName } = query;
  if (!parsed.success || !firstName || !lastName) return [];
  return (parsed.data["expanded-result"] ?? [])
    .filter((r) => containsFullName(`${r["given-names"] ?? ""} ${r["family-names"] ?? ""}`, firstName, lastName))
    .map((r) => ({
      kind: "web",
      providerId: PROVIDER_ID,
      verified: false,
      probable: false,
      site: "orcid.org",
      url: `https://orcid.org/${r["orcid-id"]}`,
      title: `${r["given-names"] ?? ""} ${r["family-names"] ?? ""} — profil de chercheur ORCID`.trim(),
      snippet: (r["institution-name"] ?? []).join(", "),
      matchedOn: "name",
    }));
}

export const orcid: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["name"],
  async search(query, signal) {
    if (!query.firstName || !query.lastName) return [];
    const q = `given-names:"${query.firstName}" AND family-name:"${query.lastName}"`;
    const url = `https://pub.orcid.org/v3.0/expanded-search/?q=${encodeURIComponent(q)}&rows=10`;
    const response = await providerFetch(PROVIDER_ID, url, signal, { headers: { Accept: "application/json" } });
    const raw: unknown = await response.json().catch(() => null);
    if (raw === null) throw new ProviderError(PROVIDER_ID, "invalid-response");
    return toFindings(raw, query);
  },
};
