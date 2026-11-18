import type { SourceRecord } from "@/server/domain/source";
import type { DataCategory } from "@/server/domain/types";
import type { XonResponse } from "./schema";

const CATEGORIES: Record<string, DataCategory> = {
  "Email addresses": "email",
  Passwords: "password",
  "Phone numbers": "phone",
  Names: "name",
  "Physical addresses": "address",
  "Dates of birth": "birthdate",
  Usernames: "username",
  "IP addresses": "ip",
};

// Second whitelist: each record is a new object built field by field.
export function toRecords(raw: XonResponse): SourceRecord[] {
  return (raw.ExposedBreaches?.breaches_details ?? []).map((b) => ({
    about: "subject",
    fields: [
      {
        field: "H1",
        value: b.breach,
        breach: {
          domain: b.domain || null,
          year: /^\d{4}/.test(b.xposed_date) ? Number(b.xposed_date.slice(0, 4)) : null,
          dataTypes: [
            ...new Set(
              b.xposed_data
                .split(";")
                .filter(Boolean)
                .map((label) => CATEGORIES[label] ?? "other"),
            ),
          ],
          records: b.xposed_records ?? null,
          verified: b.verified === true || b.verified === "Yes",
        },
      },
    ],
    // XposedOrNot names breaches, it gives no new identifier to search.
    identifiers: [],
  }));
}
