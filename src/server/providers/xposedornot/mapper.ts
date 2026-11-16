import "server-only";
import { categoriesFromLabels } from "@/server/domain/categories";
import type { AccountFinding, BreachFinding, DataCategory } from "@/server/domain/types";
import type { BreachAnalyticsResponse } from "./schema";

export const PROVIDER_ID = "xposedornot";

// XposedOrNot uses the HIBP vocabulary: shared mapping in domain/categories.ts (D30).
function toCategories(xposedData: string): DataCategory[] {
  return categoriesFromLabels(xposedData.split(";").filter((label) => label.trim().length > 0));
}

// Whitelist: each domain field is built explicitly; the raw object never leaves this file.
export function toFindings(response: BreachAnalyticsResponse): BreachFinding[] {
  const details = response.ExposedBreaches?.breaches_details ?? [];
  return details.map((breach) => ({
    kind: "breach",
    providerId: PROVIDER_ID,
    source: breach.breach,
    domain: breach.domain,
    year: breach.xposed_date,
    records: breach.xposed_records,
    categories: toCategories(breach.xposed_data),
    matchedOn: "email",
  }));
}

// Pastes are counted only: their content is never fetched.
export function toPasteFindings(response: BreachAnalyticsResponse): AccountFinding[] {
  const count = response.PastesSummary?.cnt ?? 0;
  if (count === 0) return [];
  return [
    {
      kind: "account",
      providerId: PROVIDER_ID,
      service: "Pastes (textes publiés)",
      summary: `Ton adresse apparaît dans ${count} texte${count > 1 ? "s" : ""} publié${count > 1 ? "s" : ""} sur des sites comme Pastebin, souvent des listes de comptes piratés.`,
      categories: ["email"],
      matchedOn: "email",
    },
  ];
}
