import "server-only";
import type { FieldCode } from "@/shared/fiche-fields";
import { findingKey } from "./finding";
import { identifierKey, type IdentifierType } from "./identifier";
import { nameMatches } from "./name-match";
import type { SourceRecord } from "./source";

/** Fields compared with what is already confirmed: same name, birth date or city (T4). */
export const HINT_FIELDS: readonly FieldCode[] = ["A1", "A2", "C1"];

/** Above this share of the sites checked, a pseudo is common, not rare (T4). Starting value. */
export const MAX_PSEUDO_SITE_SHARE = 0.1;

const LINKING_TYPES: ReadonlySet<IdentifierType> = new Set(["EMAIL", "TEL", "PROFIL"]);

export function isLinkedToConfirmed(record: SourceRecord, confirmedKeys: ReadonlySet<string>): boolean {
  return record.identifiers.some((id) => LINKING_TYPES.has(id.type) && confirmedKeys.has(identifierKey(id)));
}

const NAME_KEY_PREFIX = "A1:";

/** A name is the confirmed one when it equals it or holds it (T10). `confirmedValues` holds `findingKey`s. */
export function isConfirmedName(name: string, confirmedValues: ReadonlySet<string>): boolean {
  // The exact comparison stays: a one-word name never passes nameMatches, but an equal one is still a match.
  if (confirmedValues.has(findingKey("A1", name))) return true;
  for (const key of confirmedValues) {
    if (key.startsWith(NAME_KEY_PREFIX) && nameMatches(name, key.slice(NAME_KEY_PREFIX.length))) return true;
  }
  return false;
}

/** A displayed name is a hint when it holds the confirmed name (T10); the other fields must be equal. */
function isHint(field: SourceRecord["fields"][number], confirmedValues: ReadonlySet<string>): boolean {
  if (!HINT_FIELDS.includes(field.field)) return false;
  if (field.field === "A1") return isConfirmedName(field.value, confirmedValues);
  return confirmedValues.has(findingKey(field.field, field.value));
}

/** `confirmedValues` holds `findingKey` of confirmed findings. */
export function countHints(record: SourceRecord, confirmedValues: ReadonlySet<string>): number {
  return record.fields.filter((f) => isHint(f, confirmedValues)).length;
}

export function isCommonPseudo(found: number, sitesChecked: number | undefined): boolean {
  return sitesChecked !== undefined && found / sitesChecked > MAX_PSEUDO_SITE_SHARE;
}
