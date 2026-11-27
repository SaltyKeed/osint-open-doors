import "server-only";
import { z } from "zod";
import { decodeEntities } from "@/server/providers/og-tags";

const MAX_VALUE_LENGTH = 200;
const optionalText = z.string().min(1).max(MAX_VALUE_LENGTH).optional();

/** The elements of an <entry> we keep: the others (email, website, profession...) are never read (T13). */
const entrySchema = z.object({
  type: z.string().min(1).max(MAX_VALUE_LENGTH),
  name: optionalText,
  firstname: optionalText,
  street: optionalText,
  streetno: optionalText,
  zip: optionalText,
  city: optionalText,
  phone: optionalText,
});

const feedSchema = z.object({
  total: z.number().int().nonnegative(),
  entries: z.array(entrySchema),
});

export type SearchChEntry = z.infer<typeof entrySchema>;
export type SearchChFeed = z.infer<typeof feedSchema>;

const FIELDS = ["type", "name", "firstname", "street", "streetno", "zip", "city", "phone"] as const;

/** Text of the first `<tel:name>...</tel:name>` of a block, entities decoded, or undefined. */
function element(block: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(block);
  if (!match) return undefined;
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(match[1]!);
  // A CDATA section holds literal text: its entities are not decoded.
  const text = (cdata ? cdata[1]! : decodeEntities(match[1]!)).replace(/\s+/g, " ").trim();
  return text === "" ? undefined : text;
}

/**
 * Reads the Atom answer of the search.ch phone API (T13). No XML parser: the answer is flat, so regular
 * expressions find the elements and a zod schema checks the result. The error message is fixed, because the
 * body holds names and addresses.
 */
export function parseFeed(xml: string): SearchChFeed {
  if (!/<feed[\s>]/.test(xml)) throw new Error("searchch: invalid response");
  const entries: Record<string, string | undefined>[] = [];
  // The total belongs to the feed, so it is read once the entries are taken out.
  const header = xml.replace(/<entry[\s>][\s\S]*?<\/entry>/g, (block) => {
    entries.push(Object.fromEntries(FIELDS.map((field) => [field, element(block, `tel:${field}`)])));
    return "";
  });
  const total = element(header, "openSearch:totalResults");
  const parsed = feedSchema.safeParse({ total: total === undefined ? entries.length : Number(total), entries });
  if (!parsed.success) throw new Error("searchch: invalid response");
  return parsed.data;
}
