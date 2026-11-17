import "server-only";
import { isDetailed, type Confidence } from "@/server/domain/confidence";
import { fillRate, type Attribute, type Finding } from "@/server/domain/fiche";
import { CATEGORIES, FIELDS, type FieldCode } from "@/server/domain/fiche-fields";
import type { IdentifierType } from "@/server/domain/identifier";
import { maskValue } from "@/server/domain/masking";
import type { SourceStatus } from "@/server/domain/source";
import type { InvestigationResult, SourceRun } from "./engine";

// What the screen receives. Possible values and namesakes stay on the server:
// only their number is sent (CADRAGE.md, section 7, "total seulement").

export interface ViewValue {
  value: string;
  masked: string;
  confidence: Extract<Confidence, "confirme" | "probable">;
  sources: string[];
  /** "trouvé grâce à…": each step as "source (type)", without the values. */
  path: string[];
  attributes: Attribute[];
  thirdParty: boolean;
}

export interface ViewField {
  code: FieldCode;
  label: string;
  values: ViewValue[];
  /** Possible values and namesakes: counted, never shown. */
  hiddenCount: number;
}

export interface InvestigationView {
  categories: { code: string; label: string; filled: number; total: number; fields: ViewField[] }[];
  /** Services that received the visitor's data during this investigation. */
  services: string[];
  /** What each source answered: "nothing found" must not look like a failure. */
  sourceReport: SourceReport[];
}

export interface SourceReport {
  label: string;
  status: SourceStatus | "not_asked";
  records: number;
  /** Calls that failed (error, quota, unclear answer). */
  problems: number;
}

function report(label: string, runs: readonly SourceRun[]): SourceReport {
  const records = runs.reduce((sum, r) => sum + r.records, 0);
  const problems = runs.filter((r) => r.status === "error" || r.status === "quota" || r.status === "unknown").length;
  const has = (status: SourceStatus) => runs.some((r) => r.status === status);
  const status: SourceReport["status"] =
    runs.length === 0
      ? "not_asked"
      : records > 0
        ? "found"
        : has("quota")
          ? "quota"
          : has("error")
            ? "error"
            : runs.every((r) => r.status === "no_key")
              ? "no_key"
              : "not_found";
  return { label, status, records, problems };
}

const TYPE_LABELS: Record<IdentifierType, string> = {
  EMAIL: "email",
  TEL: "téléphone",
  PSEUDO: "pseudo",
  NOM: "nom",
  PROFIL: "profil",
  DOMAINE: "domaine",
  IP: "IP",
  ORGA: "organisation",
};

export function toView(
  result: InvestigationResult,
  sources: readonly { id: string; label: string }[],
): InvestigationView {
  const label = (id: string) => (id === "saisie" ? "saisie" : (sources.find((s) => s.id === id)?.label ?? id));
  const findings = [...result.fiche.values()];
  const rates = fillRate(result.fiche);

  const toValue = (f: Finding): ViewValue => {
    const best = f.sightings.find((s) => s.confidence === f.confidence) ?? f.sightings[0];
    return {
      value: f.value,
      masked: maskValue(f.field, f.value),
      confidence: f.confidence as ViewValue["confidence"],
      sources: [...new Set(f.sightings.map((s) => label(s.sourceId)))],
      path: (best?.path ?? []).map((step) => `${label(step.sourceId)} (${TYPE_LABELS[step.identifier.type]})`),
      attributes: f.attributes,
      thirdParty: f.thirdParty,
    };
  };

  return {
    categories: CATEGORIES.map((category) => {
      const rate = rates.find((r) => r.category === category.code);
      const fields = FIELDS.filter((field) => field.category === category.code)
        .map((field) => {
          const own = findings.filter((f) => f.field === field.code);
          return {
            code: field.code,
            label: field.label,
            values: own.filter((f) => isDetailed(f.confidence)).map(toValue),
            hiddenCount: own.filter((f) => !isDetailed(f.confidence)).length,
          };
        })
        .filter((field) => field.values.length > 0 || field.hiddenCount > 0);
      return { code: category.code, label: category.label, filled: rate?.filled ?? 0, total: rate?.total ?? 0, fields };
    }),
    services: [...new Set(result.runs.filter((r) => r.status !== "no_key").map((r) => label(r.sourceId)))],
    sourceReport: sources.map((s) => report(s.label, result.runs.filter((r) => r.sourceId === s.id))),
  };
}
