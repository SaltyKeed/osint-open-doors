import "server-only";
import { maskInText } from "@/server/domain/masking";
import { strongMatch } from "@/server/domain/matching";
import type { CountFinding, Finding, QueryKind, SearchQuery, WebFinding } from "@/server/domain/types";
import type { TavilyResult } from "./schema";

export const PROVIDER_ID = "tavily";

// Results of one search, with the visitor data that was searched.
export type TavilyBatch = { searchedOn: QueryKind; results: TavilyResult[] };

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "site inconnu";
  }
}

// Each page is checked: it is detailed only if it really contains the visitor's
// email or phone (anti-homonym rule). Pages of the name search without such a
// link are only counted; other unlinked pages are dropped.
export function toFindings(batches: TavilyBatch[], query: SearchQuery): Finding[] {
  const seen = new Set<string>();
  const nameOnlyUrls = new Set<string>();
  const findings: WebFinding[] = [];

  for (const { searchedOn, results } of batches) {
    for (const result of results) {
      const match = strongMatch(`${result.title} ${result.content}`, query);
      if (match) {
        if (seen.has(result.url)) continue;
        seen.add(result.url);
        nameOnlyUrls.delete(result.url);
        findings.push({
          kind: "web",
          providerId: PROVIDER_ID,
          site: siteOf(result.url),
          title: maskInText(result.title || siteOf(result.url), query),
          matchedOn: match,
        });
      } else if (searchedOn === "name" && !seen.has(result.url)) {
        nameOnlyUrls.add(result.url);
      }
    }
  }

  if (nameOnlyUrls.size === 0) return findings;
  const count: CountFinding = {
    kind: "count",
    providerId: PROVIDER_ID,
    source: "Recherche web",
    count: nameOnlyUrls.size,
    label: "pages trouvées avec ton nom, sans lien sûr avec toi (peut-être des homonymes)",
    matchedOn: "name",
  };
  return [...findings, count];
}
