import "server-only";
import { combineConfidence, isDetailed, type Confidence } from "./confidence";
import { CATEGORIES, FIELDS, type CategoryCode, type FieldCode } from "./fiche-fields";
import { fold, normalizeIdentifier } from "./identifier";
import type { Path } from "./path";

/** One column of a leak record or one detail of an account. */
export interface Attribute {
  label: string;
  value: string;
  /** false: unknown leak column, shown under "autres données de la fuite" (D25). */
  known: boolean;
}

/** A value as a source found it, before the engine rates it. */
export interface FoundValue {
  field: FieldCode;
  value: string;
  attributes?: readonly Attribute[];
  /** A relative of the volunteer (J1): never investigated (T1). */
  thirdParty?: boolean;
}

/** One time a source found the value. */
export interface Sighting {
  sourceId: string;
  /** Where the data comes from: breach name, site, page host. Two equal origins are one proof. */
  origin: string;
  /** Link to the profile or page, never a raw response. */
  evidence: string | null;
  confidence: Confidence;
  path: Path;
}

/** A "constat": one value of the fiche, with all the sources that found it. */
export interface Finding {
  field: FieldCode;
  value: string;
  attributes: Attribute[];
  sightings: Sighting[];
  confidence: Confidence;
  thirdParty: boolean;
}

export type Fiche = Map<string, Finding>;

/** Same field and same normalized value = same finding. */
function findingKey(field: FieldCode, value: string): string {
  if (field === "B1") return `${field}:${normalizeIdentifier("EMAIL", value)?.value ?? fold(value)}`;
  if (field === "B2") return `${field}:${normalizeIdentifier("TEL", value)?.value ?? fold(value)}`;
  // "https://www.chess.com/x" and "https://chess.com/x" are the same account.
  if (field === "F2") return `${field}:${normalizeIdentifier("PROFIL", value)?.value ?? fold(value)}`;
  return `${field}:${fold(value)}`;
}

/** Adds one sighting; merges it with an existing finding of the same value (D25). */
export function addSighting(fiche: Fiche, found: FoundValue, sighting: Sighting): Finding {
  const key = findingKey(found.field, found.value);
  const finding: Finding = fiche.get(key) ?? {
    field: found.field,
    value: found.value,
    attributes: [],
    sightings: [],
    confidence: sighting.confidence,
    thirdParty: found.thirdParty ?? false,
  };
  finding.sightings.push(sighting);
  for (const attribute of found.attributes ?? []) {
    if (!finding.attributes.some((a) => a.label === attribute.label && a.value === attribute.value)) {
      finding.attributes.push(attribute);
    }
  }
  finding.confidence = combineConfidence(finding.sightings);
  fiche.set(key, finding);
  return finding;
}

/** A field is filled when it has at least one confirmed or probable finding. */
export function fillRate(fiche: Fiche): { category: CategoryCode; filled: number; total: number }[] {
  const filled = new Set(
    [...fiche.values()].filter((f) => isDetailed(f.confidence)).map((f) => f.field),
  );
  return CATEGORIES.map(({ code }) => {
    const fields = FIELDS.filter((f) => f.category === code);
    return { category: code, filled: fields.filter((f) => filled.has(f.code)).length, total: fields.length };
  });
}

