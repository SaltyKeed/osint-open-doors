import "server-only";
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

// Reverse lookup: only listings that really carry the visitor's number are kept.
// Only the kinds of published data are returned, never the values (whitelist).
export function toDirectoryFindings(feed: SearchChFeed, query: SearchQuery): DirectoryFinding[] {
  return (feed.entry ?? [])
    .filter((entry) => strongMatch(entry.phone ?? "", { phone: query.phone }) === "phone")
    .map((entry) => {
      const categories: DataCategory[] = ["phone"];
      if (entry.name || entry.firstname) categories.push("name");
      if (entry.street) categories.push("address");
      if (entry.city) categories.push("location");
      return {
        kind: "directory",
        providerId: PROVIDER_ID,
        source: SOURCE,
        categories,
        noPromo: entry.nopromo?.trim() === "*",
        matchedOn: "phone",
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
