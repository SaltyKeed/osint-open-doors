import "server-only";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

// search.ch answers in XML (Atom). The parser turns it into an object,
// then zod keeps only the fields we use. Namespaces are removed:
// <tel:name> becomes "name", <openSearch:totalResults> becomes "totalResults".
const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false, // keep "079..." and zip codes as strings
  isArray: (tagName) => tagName === "entry",
});

const entrySchema = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  firstname: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  nopromo: z.string().optional(),
});

const feedSchema = z.object({
  feed: z.object({
    totalResults: z.coerce.number(),
    entry: z.array(entrySchema).optional(),
  }),
});

export type SearchChEntry = z.infer<typeof entrySchema>;
export type SearchChFeed = z.infer<typeof feedSchema>["feed"];

export function parseFeed(xml: string): SearchChFeed | null {
  const parsed = feedSchema.safeParse(parser.parse(xml));
  return parsed.success ? parsed.data.feed : null;
}
