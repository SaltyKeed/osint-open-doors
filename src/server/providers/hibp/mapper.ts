import "server-only";
import { z } from "zod";
import { categoriesFromLabels } from "@/server/domain/categories";
import { breachKey } from "@/server/domain/merge";
import type { BreachFinding, Finding } from "@/server/domain/types";

// Public breach catalog of Have I Been Pwned (GET /api/v3/breaches, no key, licence
// CC BY 4.0: attribution shown on the results screen). It describes each breach; it
// never tells whether the visitor is in it, so it only completes breaches found by
// the other sources (D29). No visitor data is sent to HIBP.

export const catalogSchema = z.array(
  z.object({
    Name: z.string(),
    Title: z.string(),
    Domain: z.string().default(""),
    BreachDate: z.string().default(""),
    PwnCount: z.number().default(0),
    Description: z.string().default(""),
    LogoPath: z.string().default(""),
    DataClasses: z.array(z.string()).default([]),
    IsVerified: z.boolean().default(true),
    IsFabricated: z.boolean().default(false),
    IsSpamList: z.boolean().default(false),
    IsMalware: z.boolean().default(false),
    IsStealerLog: z.boolean().default(false),
  }),
);

export type CatalogEntry = z.infer<typeof catalogSchema>[number];

export const toCategories = categoriesFromLabels;

// The catalog description is HTML (links, <em>...). The results screen shows plain text
// only (no link on the kiosk), so the tags and entities are turned into text here.
export function toPlainText(html: string): string {
  const text = html
    .replace(/<\/?(?:a|em|strong|b|i)\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

// "Zacks.com (2024)" and "zacks.com" are the same breach for the lookup.
function lookupKey(name: string): string {
  return breachKey(name.replace(/\s*\(\d{4}\)\s*$/, ""));
}

export function indexCatalog(catalog: CatalogEntry[]): Map<string, CatalogEntry> {
  const index = new Map<string, CatalogEntry>();
  for (const entry of catalog) {
    for (const name of [entry.Name, entry.Title, entry.Domain]) {
      const key = name ? lookupKey(name) : "";
      if (key !== "" && !index.has(key)) index.set(key, entry);
    }
  }
  return index;
}

// Warnings shown with the breach, from the quality flags of the catalog.
function notesOf(entry: CatalogEntry): string[] {
  const notes: string[] = [];
  if (entry.IsFabricated) notes.push("Fuite probablement inventée");
  else if (!entry.IsVerified) notes.push("Fuite non confirmée");
  if (entry.IsSpamList) notes.push("Liste de spam");
  if (entry.IsMalware || entry.IsStealerLog) notes.push("Données volées par un logiciel espion");
  return notes;
}

function enrich(breach: BreachFinding, entry: CatalogEntry): BreachFinding {
  const categories = [...new Set([...breach.categories, ...toCategories(entry.DataClasses)])];
  const notes = notesOf(entry);
  const description = toPlainText(entry.Description);
  return {
    ...breach,
    title: entry.Title || breach.source,
    domain: breach.domain || entry.Domain || undefined,
    year: breach.year ?? (/^\d{4}/.test(entry.BreachDate) ? entry.BreachDate.slice(0, 4) : undefined),
    records: breach.records ?? (entry.PwnCount > 0 ? entry.PwnCount : undefined),
    categories,
    describedBy: "hibp",
    ...(description !== "" ? { description } : {}),
    // Logo served by HIBP over HTTPS (public asset, no personal data).
    ...(entry.LogoPath ? { logo: entry.LogoPath } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}

// Completes each breach found by another source with the catalog description.
export function enrichBreaches(findings: Finding[], index: Map<string, CatalogEntry>): Finding[] {
  return findings.map((finding) => {
    if (finding.kind !== "breach") return finding;
    const entry = index.get(lookupKey(finding.source)) ?? (finding.domain ? index.get(lookupKey(finding.domain)) : undefined);
    return entry ? enrich(finding, entry) : finding;
  });
}
