import "server-only";
import { z } from "zod";
import type { Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";
import { mentions } from "../websearch/mapper";

const searchSchema = z.object({
  "expanded-result": z
    .array(
      z.object({
        "orcid-id": z.string(),
        "given-names": z.string().nullish(),
        "family-names": z.string().nullish(),
        "institution-name": z.array(z.string()).nullish(),
      }),
    )
    .nullish(),
});

/** Researchers with the full name: the profile (E3) and their institutions (E1). */
export function toOrcidRecords(raw: unknown, name: Identifier): SourceRecord[] {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) return [];
  return (parsed.data["expanded-result"] ?? [])
    .filter((r) => mentions(`${r["given-names"] ?? ""} ${r["family-names"] ?? ""}`, name))
    .map((r) => {
      const url = `https://orcid.org/${r["orcid-id"]}`;
      return {
        origin: "ORCID",
        evidence: url,
        values: [
          { field: "E3", value: url, attributes: [{ label: "Service", value: "Profil de chercheur ORCID", known: true }] },
          ...(r["institution-name"] ?? []).map((value) => ({ field: "E1" as const, value })),
        ],
        identifiers: [],
      };
    });
}

// ORCID (SOURCES.md, section 6): researchers and their institutions.
export const orcid: Source = {
  id: "orcid",
  label: "ORCID",
  accepts: ["NOM"],
  requiredEnv: [],
  async run(name, { signal }) {
    const [given, ...family] = name.value.split(" ");
    if (!given || family.length === 0) return found([]);
    const q = `given-names:"${given}" AND family-name:"${family.join(" ")}"`;
    const response = await fetch(`https://pub.orcid.org/v3.0/expanded-search/?q=${encodeURIComponent(q)}&rows=10`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`orcid: HTTP ${response.status}`);
    return found(toOrcidRecords(await response.json(), name));
  },
};
