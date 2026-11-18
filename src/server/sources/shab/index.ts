import "server-only";
import { z } from "zod";
import { found, type Source, type SourceRecord } from "@/server/domain/source";

const MAX_RESULTS = 10;

const publicationsSchema = z.object({
  content: z.array(
    z.object({
      meta: z.object({
        id: z.string(),
        rubric: z.string(),
        publicationDate: z.string(),
        cantons: z.array(z.string()).default([]),
        title: z.object({ fr: z.string().optional(), de: z.string().optional() }),
      }),
    }),
  ),
});

const swissDate = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
};

/**
 * Only the commercial register ("HR"): a board seat or a signing right is public.
 * Bankruptcies, debt collection and civil status are never shown (first prototype, D24).
 */
export function toShabRecords(raw: unknown): SourceRecord[] {
  const parsed = publicationsSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.content
    .filter((p) => p.meta.rubric === "HR")
    .map(({ meta }) => {
      const url = `https://www.shab.ch/#!/search/publications/detail/${meta.id}`;
      return {
        origin: "FOSC",
        evidence: url,
        values: [
          {
            field: "E2",
            value: meta.title.fr ?? meta.title.de ?? "Publication du registre du commerce",
            attributes: [
              {
                label: "Publication",
                value: `${swissDate(meta.publicationDate)}${meta.cantons.length > 0 ? `, canton ${meta.cantons.join(", ")}` : ""}`,
                known: true,
              },
              { label: "Adresse", value: url, known: true },
            ],
          },
        ],
        identifiers: [],
      };
    });
}

async function search(phrase: string, signal: AbortSignal): Promise<SourceRecord[]> {
  const params = new URLSearchParams({
    keyword: `"${phrase}"`,
    rubrics: "HR",
    publicationStates: "PUBLISHED",
    "pageRequest.size": String(MAX_RESULTS),
  });
  const response = await fetch(`https://amtsblattportal.ch/api/v1/publications?${params}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`shab: HTTP ${response.status}`);
  return toShabRecords(await response.json().catch(() => null));
}

// Swiss Official Gazette of Commerce, open data (SOURCES.md, section 5). The register
// writes people as "Nom, Prénom": both orders are searched.
export const shab: Source = {
  id: "shab",
  label: "FOSC (registre du commerce)",
  accepts: ["NOM"],
  requiredEnv: [],
  async run(name, { signal }) {
    const [first, ...rest] = name.value.split(" ");
    if (!first || rest.length === 0) return found([]);
    const results = await Promise.all([search(`${rest.join(" ")}, ${first}`, signal), search(name.value, signal)]);
    const byUrl = new Map(results.flat().map((r) => [r.evidence, r]));
    return found([...byUrl.values()].slice(0, MAX_RESULTS));
  },
};
