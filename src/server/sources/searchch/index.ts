import "server-only";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { FoundValue } from "@/server/domain/fiche";
import { normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";

// search.ch answers in XML (Atom). The parser turns it into an object, then zod keeps
// only the fields we use. Namespaces are removed: <tel:name> becomes "name".
const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false, // keep "079..." and zip codes as strings
  isArray: (tagName) => tagName === "entry",
});

const entrySchema = z.object({
  name: z.string().optional(),
  firstname: z.string().optional(),
  street: z.string().optional(),
  streetno: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

const feedSchema = z.object({ feed: z.object({ entry: z.array(entrySchema).optional() }) });

export type SearchChFeed = z.infer<typeof feedSchema>["feed"];

export function parseFeed(xml: string): SearchChFeed | null {
  const parsed = feedSchema.safeParse(parser.parse(xml));
  return parsed.success ? parsed.data.feed : null;
}

/** Reverse lookup: only listings that really carry the searched number are kept. */
export function toDirectoryRecords(feed: SearchChFeed, phone: Identifier): SourceRecord[] {
  return (feed.entry ?? [])
    .filter((e) => normalizeIdentifier("TEL", e.phone ?? "")?.value === phone.value)
    .map((e) => {
      const name = [e.firstname, e.name].filter(Boolean).join(" ");
      const street = [e.street, e.streetno].filter(Boolean).join(" ");
      const place = [e.zip, e.city].filter(Boolean).join(" ");
      const address = [street, place].filter(Boolean).join(", ");
      const values: FoundValue[] = [
        ...(name ? [{ field: "A1" as const, value: name }] : []),
        { field: "B2", value: phone.value },
        ...(address ? [{ field: "B3" as const, value: address }] : []),
        ...(e.city ? [{ field: "C1" as const, value: e.city }] : []),
      ];
      const nameId = name ? normalizeIdentifier("NOM", name) : null;
      return {
        origin: "search.ch",
        evidence: null,
        values,
        identifiers: [{ identifier: phone }, ...(nameId ? [{ identifier: nameId }] : [])],
      };
    });
}

// Swiss phone directory (SOURCES.md, section 5). The key is in the URL and search.ch
// copies it into its answer: the raw text is never logged nor returned.
export const searchCh: Source = {
  id: "searchch",
  label: "search.ch (annuaire)",
  accepts: ["TEL"],
  requiredEnv: ["SEARCH_CH_API_KEY"],
  async run(phone, { signal, env }) {
    const params = new URLSearchParams({ was: phone.value, privat: "1", firma: "0", key: env.SEARCH_CH_API_KEY ?? "" });
    const response = await fetch(`https://search.ch/tel/api/?${params}`, { signal });
    if (response.status === 403) throw new Error("searchch: HTTP 403");
    if (response.status === 429) throw new Error("searchch: HTTP 429");
    if (!response.ok) throw new Error(`searchch: HTTP ${response.status}`);
    const feed = parseFeed(await response.text());
    if (!feed) throw new Error("searchch: invalid response");
    return found(toDirectoryRecords(feed, phone));
  },
};
