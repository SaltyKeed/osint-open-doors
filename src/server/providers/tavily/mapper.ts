import "server-only";
import { maskContacts } from "@/server/domain/masking";
import { containsFullName, strongMatch } from "@/server/domain/matching";
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

function snippetOf(content: string): string {
  const text = content.replace(/\s+/g, " ").trim();
  return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
}

// Every page is checked against the visitor's email and phone:
// - it contains one of them: verified, it is about the visitor;
// - name search: kept as "not verified" (D15) only if the full name appears
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
        if (!containsFullName(text, query.firstName, query.lastName)) continue;
      }

      const existing = byUrl.get(result.url);
      if (existing?.verified) continue;

      byUrl.set(result.url, {
        kind: "web",
        providerId: PROVIDER_ID,
        verified: match !== null,
        site: siteOf(result.url),
        url: result.url,
        title: maskContacts(result.title || siteOf(result.url)),
        snippet: maskContacts(snippetOf(result.content)),
        matchedOn: match ?? "name",
      });
    }
  }

  // Verified pages first.
  return [...byUrl.values()].sort((a, b) => Number(b.verified) - Number(a.verified));
}
