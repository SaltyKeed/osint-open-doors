import "server-only";
import type { Attribute } from "@/server/domain/fiche";
import type { Identifier } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";
import type { HudsonRockAnswer } from "./schema";

const swissDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CH", { timeZone: "UTC" });

/** One H5 value per infected computer (SOURCES.md, section 1.1). */
export function toHudsonRockRecords(answer: HudsonRockAnswer, queried: Identifier): SourceRecord[] {
  return answer.stealers.map((s) => {
    const date = s.date_compromised ? swissDate(s.date_compromised) : "date inconnue";
    const antivirus = Array.isArray(s.antiviruses) ? s.antiviruses.join(", ") : s.antiviruses;
    const attributes: Attribute[] = [
      ...(s.operating_system ? [{ label: "Système", value: s.operating_system, known: true }] : []),
      ...(s.total_user_services != null
        ? [{ label: "Identifiants volés", value: String(s.total_user_services), known: true }]
        : []),
      ...(s.total_corporate_services
        ? [{ label: "Identifiants d'entreprise", value: String(s.total_corporate_services), known: true }]
        : []),
      ...(antivirus ? [{ label: "Antivirus", value: antivirus, known: true }] : []),
    ];
    return {
      origin: "Hudson Rock",
      evidence: null,
      // Date and system in the value: two computers infected the same day stay two findings.
      values: [
        { field: "H5", value: `Ordinateur infecté le ${date} (${s.operating_system ?? "système inconnu"})`, attributes },
      ],
      identifiers: [{ identifier: queried }],
    };
  });
}
