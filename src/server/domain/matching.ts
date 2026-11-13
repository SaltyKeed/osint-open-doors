import "server-only";
import { normalizeEmail, normalizeSwissPhone } from "./search-query";
import type { PersonRecord, SearchQuery } from "./types";

/**
 * A record is shown in detail only if it contains the phone or the email the
 * visitor typed. The name alone never confirms: it could be a namesake.
 */
export function isConfirmedMatch(record: PersonRecord, query: SearchQuery): boolean {
  const samePhone =
    query.phone !== undefined &&
    record.phone !== undefined &&
    normalizeSwissPhone(record.phone) === query.phone;
  const sameEmail =
    query.email !== undefined &&
    record.email !== undefined &&
    normalizeEmail(record.email) === query.email;
  return samePhone || sameEmail;
}

export function splitByMatch(
  records: PersonRecord[],
  query: SearchQuery,
): { confirmed: PersonRecord[]; homonymCount: number } {
  const confirmed = records.filter((record) => isConfirmedMatch(record, query));
  return { confirmed, homonymCount: records.length - confirmed.length };
}
