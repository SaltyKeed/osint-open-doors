import "server-only";
import { z } from "zod";
import type { Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";
import { mentions } from "../websearch/mapper";

const searchSchema = z.object({
  search: z.array(z.object({ id: z.string(), label: z.string().nullish(), description: z.string().nullish() })).optional(),
});

/** Notable people with the full name: one I1 value per item. */
export function toWikidataRecords(raw: unknown, name: Identifier): SourceRecord[] {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) return [];
  return (parsed.data.search ?? [])
    .filter((r) => mentions(r.label ?? "", name))
    .map((r) => {
      const url = `https://www.wikidata.org/wiki/${r.id}`;
      return {
        origin: "Wikidata",
        evidence: url,
        values: [
          {
            field: "I1",
            value: [r.label, r.description].filter(Boolean).join(" — "),
            attributes: [{ label: "Adresse", value: url, known: true }],
          },
        ],
        identifiers: [],
      };
    });
}

// Wikidata (SOURCES.md, section 6): notable people.
export const wikidata: Source = {
  id: "wikidata",
  label: "Wikidata",
  accepts: ["NOM"],
  requiredEnv: [],
  async run(name, { signal }) {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      search: name.value,
      language: "fr",
      uselang: "fr",
      format: "json",
      limit: "10",
      type: "item",
    });
    const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
      signal,
      headers: { "User-Agent": "osint-open-doors (school awareness project)" },
    });
    if (!response.ok) throw new Error(`wikidata: HTTP ${response.status}`);
    return found(toWikidataRecords(await response.json(), name));
  },
};
