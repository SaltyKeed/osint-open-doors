import "server-only";
import { CONFIDENCE_LEVELS, type Confidence } from "./confidence";
import type { FieldCode } from "./fiche-fields";
import type { Identifier } from "./identifier";
import { normalizeEmail, normalizeSwissPhone } from "./search-query";

/** One piece of the fiche, with where it came from. */
export interface Finding {
  field: FieldCode;
  value: string;
  /** Ids of the sources that returned this value. */
  sources: string[];
  confidence: Confidence;
  /** From the visitor's input to the identifier whose search gave this finding. */
  path: Identifier[];
}

/** The form used to decide whether two values are the same. */
function comparedValue(field: FieldCode, value: string): string {
  if (field === "B1") return normalizeEmail(value);
  if (field === "B2") return normalizeSwissPhone(value) ?? value.trim();
  return value.trim().toLowerCase();
}

function surer(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_LEVELS.indexOf(a) <= CONFIDENCE_LEVELS.indexOf(b) ? a : b;
}

export function mergeFindings(findings: Finding[]): Finding[] {
  const merged = new Map<string, Finding>();
  for (const finding of findings) {
    // The field is part of the key: the same city in C1 and C2 stays two findings.
    const key = `${finding.field}:${comparedValue(finding.field, finding.value)}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...finding, sources: [...new Set(finding.sources)] });
      continue;
    }
    existing.sources = [...new Set([...existing.sources, ...finding.sources])];
    existing.confidence = surer(existing.confidence, finding.confidence);
    if (finding.path.length < existing.path.length) existing.path = finding.path;
  }
  return [...merged.values()];
}
