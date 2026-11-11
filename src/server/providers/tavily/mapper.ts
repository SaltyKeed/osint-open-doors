import "server-only";
import { maskContacts } from "@/server/domain/masking";
import { containsNameOrInitial, contextMatch, strongMatch } from "@/server/domain/matching";
import type { QueryKind, SearchQuery, WebFinding } from "@/server/domain/types";
import type { TavilyResult } from "./schema";

export const PROVIDER_ID = "tavily";
const SNIPPET_LENGTH = 300;

// Results of one search, with the visitor data that was searched.
export type TavilyBatch = { searchedOn: QueryKind; results: TavilyResult[] };

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "site inconnu";
  }
}

// Tavily content is often Markdown: keep the words only (links become their text).
export function plainText(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(^|\s)#{1,6}\s+/g, "$1")
    .replace(/[*`]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function snippetOf(content: string): string {
  const text = plainText(content);
  return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
}

// Every page is checked against the visitor's email and phone:
// - it contains one of them: verified, it is about the visitor;
// - name search: kept as "not verified" (D17) only if the full name appears
//   together (first + last name), otherwise dropped;
// - email or phone search without such a link: dropped (the engine matched something else).
// Emails and phone numbers inside titles and snippets are always masked.
export function toFindings(batches: TavilyBatch[], query: SearchQuery): WebFinding[] {
  const byUrl = new Map<string, WebFinding>();

  for (const { searchedOn, results } of batches) {
    for (const result of results) {
      // The full page text is checked too: the short snippet often misses the name.
      const text = `${result.title} ${result.content} ${result.raw_content ?? ""}`;
      const match = strongMatch(text, query);
      if (!match) {
        if (searchedOn !== "name" || !query.firstName || !query.lastName) continue;
        if (!containsNameOrInitial(text, query.firstName, query.lastName)) continue;
      }
      const context = match ? null : contextMatch(text, query);

      const existing = byUrl.get(result.url);
      if (existing?.verified) continue;

      byUrl.set(result.url, {
        kind: "web",
        providerId: PROVIDER_ID,
        verified: match !== null,
        probable: context !== null,
        probableBecause: context ?? undefined,
        site: siteOf(result.url),
        url: result.url,
        title: maskContacts(plainText(result.title) || siteOf(result.url)),
        snippet: maskContacts(snippetOf(result.content)),
        matchedOn: match ?? "name",
      });
    }
  }

  // Verified pages first, then probable ones.
  const rank = (f: WebFinding) => (f.verified ? 2 : f.probable ? 1 : 0);
  return [...byUrl.values()].sort((a, b) => rank(b) - rank(a));
}
