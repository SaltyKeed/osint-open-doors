import "server-only";
import type { AccountFinding, BreachFinding, DataCategory } from "@/server/domain/types";
import type { BreachAnalyticsResponse } from "./schema";

export const PROVIDER_ID = "xposedornot";

// XposedOrNot vocabulary -> domain categories. Anything unknown becomes "other".
const CATEGORY_MAP: Record<string, DataCategory> = {
  "Email addresses": "email",
  Passwords: "password",
  Names: "name",
  "Phone numbers": "phone",
  "Physical addresses": "address",
  "Dates of birth": "birthDate",
  Usernames: "username",
  "IP addresses": "ipAddress",
  "Credit card details": "financial",
  "Partial credit card data": "financial",
  "Account balances": "financial",
  "Financial transactions": "financial",
  "Government IDs": "governmentId",
  "Government issued IDs": "governmentId",
  "Partial government issued IDs": "governmentId",
  "Social security numbers": "governmentId",
  "Geographic locations": "location",
};

function toCategories(xposedData: string): DataCategory[] {
  const categories = xposedData
    .split(";")
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .map((label) => CATEGORY_MAP[label] ?? "other");
  return [...new Set(categories)];
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
