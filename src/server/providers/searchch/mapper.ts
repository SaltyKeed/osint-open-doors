import "server-only";
import { MAX_HOMONYMS } from "@/server/domain/confidence";
import type { Identifier } from "@/server/domain/identifier";
import { normalizeSwissPhone } from "@/server/domain/search-query";
import type { SourceField, SourceRecord } from "@/server/domain/source";
import type { SearchChEntry, SearchChFeed } from "./parse";

function hasWord(text: string, word: string): boolean {
  return text.toLowerCase().split(/\s+/).includes(word.toLowerCase());
}

/** "Léa Martin": first name then name, unless the directory already wrote the first name in the name. */
function fullName(entry: SearchChEntry): string | undefined {
  const { name, firstname } = entry;
  if (!name) return undefined;
  // "Martin" + "Martin" is one person: the first name is only looked for in a name of several words.
  const alreadyThere = firstname !== undefined && name.trim().split(/\s+/).length > 1 && hasWord(name, firstname);
  return firstname && !alreadyThere ? `${firstname} ${name}` : name;
}

/** "Rue du Lac 1, 2000 Neuchâtel", without the missing parts. Nothing without a street. */
function address(entry: SearchChEntry): string | undefined {
  if (!entry.street) return undefined;
  const street = [entry.street, entry.streetno].filter(Boolean).join(" ");
  const place = [entry.zip, entry.city].filter(Boolean).join(" ");
  return place === "" ? street : `${street}, ${place}`;
}

/**
 * Second whitelist: name, address and city only. The profession, email, website and phone of an
 * entry may be a relative's, so they are never kept (T13).
 */
function fieldsOf(entry: SearchChEntry, holder: boolean): SourceField[] | undefined {
  const name = fullName(entry);
  if (!name) return undefined;
  const street = address(entry);
  return [
    { field: "A1", value: name, ...(holder && { holder: true }) },
    ...(street ? [{ field: "B3" as const, value: street }] : []),
    ...(entry.city ? [{ field: "C1" as const, value: entry.city }] : []),
  ];
}

/**
 * TEL: the first private person listed for this number, attached to the visitor, who certified the
 * number. The name is marked as the holder's: the engine decides if it is the visitor's (T13).
 * NOM: one record per person when there are at most MAX_HOMONYMS, otherwise only the total.
 * An organisation is never attached to a visitor.
 */
export function toRecords(feed: SearchChFeed, queried: Identifier): SourceRecord[] {
  const people = feed.entries.filter((e) => e.type === "Person");
  if (queried.type === "TEL") {
    const wanted = normalizeSwissPhone(queried.value);
    // The entry must give the number we asked for: a fuzzy hit, or one without number, could be a stranger's.
    const entry = people.find((e) => wanted !== null && e.phone !== undefined && normalizeSwissPhone(e.phone) === wanted);
    const fields = entry && fieldsOf(entry, true);
    return fields ? [{ about: "subject", fields, identifiers: [] }] : [];
  }
  if (queried.type !== "NOM" || feed.total === 0) return [];
  if (feed.total > MAX_HOMONYMS) return [{ about: "subject", homonyms: feed.total, fields: [], identifiers: [] }];
  return people.flatMap((entry) => {
    const fields = fieldsOf(entry, false);
    return fields ? [{ about: "subject" as const, homonyms: feed.total, fields, identifiers: [] }] : [];
  });
}
