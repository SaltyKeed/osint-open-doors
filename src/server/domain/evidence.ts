import "server-only";
import type { FieldCode } from "./fiche-fields";
import { findingKey } from "./finding";
import { identifierKey, type IdentifierType } from "./identifier";
import type { SourceRecord } from "./source";

/** Fields compared with what is already confirmed: same name, birth date or city (T4). */
export const HINT_FIELDS: readonly FieldCode[] = ["A1", "A2", "C1"];

/** Above this share of the sites checked, a pseudo is common, not rare (T4). Starting value. */
export const MAX_PSEUDO_SITE_SHARE = 0.1;

const LINKING_TYPES: ReadonlySet<IdentifierType> = new Set(["EMAIL", "TEL", "PROFIL"]);

export function isLinkedToConfirmed(record: SourceRecord, confirmedKeys: ReadonlySet<string>): boolean {
  return record.identifiers.some((id) => LINKING_TYPES.has(id.type) && confirmedKeys.has(identifierKey(id)));
}

/** `confirmedValues` holds `findingKey` of confirmed findings. */
export function countHints(record: SourceRecord, confirmedValues: ReadonlySet<string>): number {
  return record.fields.filter(
    (f) => HINT_FIELDS.includes(f.field) && confirmedValues.has(findingKey(f.field, f.value)),
  ).length;
}

export function isCommonPseudo(found: number, sitesChecked: number | undefined): boolean {
  return sitesChecked !== undefined && found / sitesChecked > MAX_PSEUDO_SITE_SHARE;
}
