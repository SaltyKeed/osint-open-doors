import "server-only";
import { CONFIDENCE_LEVELS, type Confidence } from "./confidence";
import type { FieldCode } from "@/shared/fiche-fields";
import type { Identifier } from "./identifier";
import { normalizeEmail, normalizeSwissPhone } from "./search-query";
import type { BreachDetails, InfectionDetails, PageDetails, ProfileDetails } from "./source";

/** One piece of the fiche, with where it came from. */
export interface Finding {
  field: FieldCode;
  value: string;
  /** Ids of the sources that returned this value. */
  sources: string[];
  confidence: Confidence;
  /** From the visitor's input to the identifier whose search gave this finding. */
  path: Identifier[];
  /** Only on H1, see SourceField. */
  breach?: BreachDetails;
  /** Only on H5, see SourceField. */
  infection?: InfectionDetails;
  /** Only on I1, see SourceField. */
  page?: PageDetails;
  /** Only on F2, see SourceField. */
  profile?: ProfileDetails;
}

/** The form used to decide whether two values are the same. */
function comparedValue(field: FieldCode, value: string): string {
  if (field === "B1") return normalizeEmail(value);
  if (field === "B2") return normalizeSwissPhone(value) ?? value.trim();
  return value.trim().toLowerCase();
}

/** Two findings with the same key are the same piece of information. */
export function findingKey(field: FieldCode, value: string): string {
  return `${field}:${comparedValue(field, value)}`;
}

function surer(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_LEVELS.indexOf(a) <= CONFIDENCE_LEVELS.indexOf(b) ? a : b;
}

function mergeBreach(a: BreachDetails | undefined, b: BreachDetails | undefined): BreachDetails | undefined {
  if (!a || !b) return a ?? b;
  return {
    domain: a.domain ?? b.domain,
    year: a.year ?? b.year,
    dataTypes: [...new Set([...a.dataTypes, ...b.dataTypes])],
    records: a.records ?? b.records,
    verified: a.verified || b.verified,
  };
}

export function mergeFindings(findings: Finding[]): Finding[] {
  const merged = new Map<string, Finding>();
  for (const finding of findings) {
    // The field is part of the key: the same city in C1 and C2 stays two findings.
    const key = findingKey(finding.field, finding.value);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...finding, sources: [...new Set(finding.sources)] });
      continue;
    }
    existing.sources = [...new Set([...existing.sources, ...finding.sources])];
    existing.confidence = surer(existing.confidence, finding.confidence);
    if (finding.path.length < existing.path.length) existing.path = finding.path;
    const breach = mergeBreach(existing.breach, finding.breach);
    if (breach) existing.breach = breach;
    // Only one infostealer source today: the first details are kept.
    existing.infection ??= finding.infection;
    existing.page ??= finding.page;
    existing.profile ??= finding.profile;
  }
  return [...merged.values()];
}
