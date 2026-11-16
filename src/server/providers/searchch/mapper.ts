import "server-only";
import type { Commune } from "@/server/domain/commune";
import { strongMatch } from "@/server/domain/matching";
import type {
  CountFinding,
  DataCategory,
  DirectoryFinding,
  SearchQuery,
} from "@/server/domain/types";
import type { SearchChFeed } from "./schema";

export const PROVIDER_ID = "searchch";
const SOURCE = "search.ch (annuaire)";

// Finds the commune of a zip code and a locality (src/server/geo/communes.ts). Passed
// as a parameter so that the tests use invented communes.
export type CommuneResolver = (zip: string | undefined, city: string | undefined) => Commune | undefined;

// Reverse lookup: only listings that really carry the visitor's number are kept.
// Only the kinds of published data are returned, never the values (whitelist).
// One exception under review (D27): the commune, found from the zip code and the
// locality. The street and the number are never read.
export function toDirectoryFindings(
  feed: SearchChFeed,
  query: SearchQuery,
  resolveCommune?: CommuneResolver,
): DirectoryFinding[] {
  return (feed.entry ?? [])
    .filter((entry) => strongMatch(entry.phone ?? "", { phone: query.phone }) === "phone")
    .map((entry) => {
      const categories: DataCategory[] = ["phone"];
      if (entry.name || entry.firstname) categories.push("name");
      if (entry.street) categories.push("address");
      if (entry.city) categories.push("location");
      const commune = resolveCommune?.(entry.zip, entry.city);
      return {
        kind: "directory",
        providerId: PROVIDER_ID,
        source: SOURCE,
        categories,
        noPromo: entry.nopromo?.trim() === "*",
        matchedOn: "phone",
        ...(commune && { commune }),
      };
    });
}

// Name search uses count_only: listings of homonyms are never downloaded.
export function toNameCount(feed: SearchChFeed): CountFinding | null {
  if (feed.totalResults === 0) return null;
  return {
    kind: "count",
    providerId: PROVIDER_ID,
    source: SOURCE,
    count: feed.totalResults,
    label: "inscriptions portent ce nom dans l'annuaire (peut-être des homonymes)",
    matchedOn: "name",
  };
}
