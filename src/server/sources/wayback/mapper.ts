import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";

const MAX_PAGES = 20;

/** A profile is looked up as its own address; a domain with all its pages. */
export function archiveTarget(identifier: Identifier): { url: string; matchType: "exact" | "domain" } {
  if (identifier.type === "DOMAINE") return { url: identifier.value, matchType: "domain" };
  return { url: identifier.value.replace(/^https?:\/\//, ""), matchType: "exact" };
}

/** "20190312101500" gives "12.03.2019". */
const day = (ts: string) => `${ts.slice(6, 8)}.${ts.slice(4, 6)}.${ts.slice(0, 4)}`;

/**
 * Rows of the CDX API: a header, then [timestamp, original]. One I2 value per
 * profile or domain: first and last capture, count, and the oldest archived copy
 * (still readable when the page has been deleted).
 */
export function toArchiveRecord(rows: readonly (readonly string[])[], identifier: Identifier): SourceRecord | null {
  const captures = rows.slice(1).filter((r) => r.length >= 2) as [string, string][];
  const first = captures[0];
  const last = captures.at(-1);
  if (!first || !last) return null;
  const link = `https://web.archive.org/web/${first[0]}/${first[1]}`;
  const pages = [...new Set(captures.map((c) => c[1]))].slice(0, MAX_PAGES);
  return {
    origin: "Wayback Machine",
    evidence: link,
    values: [
      {
        field: "I2",
        value: archiveTarget(identifier).url,
        attributes: [
          { label: "Première capture", value: day(first[0]), known: true },
          { label: "Dernière capture", value: day(last[0]), known: true },
          { label: "Captures", value: String(captures.length), known: true },
          { label: "Archive", value: link, known: true },
          ...(identifier.type === "DOMAINE" ? [{ label: "Pages archivées", value: pages.join(", "), known: true }] : []),
        ],
      },
    ],
    identifiers: [{ identifier }],
  };
}
