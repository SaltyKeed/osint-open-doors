import "server-only";
import { z } from "zod";
import type { WebFinding } from "@/server/domain/types";

export const PROVIDER_ID = "shab";

// Shape of GET https://amtsblattportal.ch/api/v1/publications (fields we use).
export const publicationsSchema = z.object({
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

const dateFr = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
};

// Only the commercial register ("HR"): a board seat or a signing right is public and
// harmless. Bankruptcies, debt collection and civil status are never shown (D24).
export function toFindings(raw: unknown): WebFinding[] {
  const parsed = publicationsSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.content
    .filter((p) => p.meta.rubric === "HR")
    .map(({ meta }) => ({
      kind: "web",
      providerId: PROVIDER_ID,
      // Found by name only: maybe a homonym (D17).
      verified: false,
      probable: false,
      site: "Feuille officielle suisse du commerce",
      url: `https://www.shab.ch/#!/search/publications/detail/${meta.id}`,
      title: meta.title.fr ?? meta.title.de ?? "Publication du registre du commerce",
      snippet: `Registre du commerce, publication du ${dateFr(meta.publicationDate)}${
        meta.cantons.length > 0 ? `, canton ${meta.cantons.join(", ")}` : ""
      }`,
      matchedOn: "name",
    }));
}
