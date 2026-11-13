import type { DataCategory, Exposure } from "@/server/domain/types";
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

// Second whitelist: each Exposure is a new object built field by field.
export function toExposures(raw: XonResponse): Exposure[] {
  return (raw.ExposedBreaches?.breaches_details ?? []).map((b) => ({
    providerId: "xposedornot",
    source: b.breach,
    domain: b.domain || null,
    year: /^\d{4}/.test(b.xposed_date) ? Number(b.xposed_date.slice(0, 4)) : null,
    categories: [
      ...new Set(
        b.xposed_data
          .split(";")
          .filter(Boolean)
          .map((label) => CATEGORIES[label] ?? "other"),
      ),
    ],
    recordCount: b.xposed_records ?? null,
    verified: b.verified === true || b.verified === "Yes",
  }));
}
