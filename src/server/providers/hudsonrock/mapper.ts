import type { SourceRecord } from "@/server/domain/source";
import type { HudsonRockResponse } from "./schema";

/** Hudson Rock writes "Not Found" instead of leaving a value out. */
function known(value: string | null | undefined): string | null {
  return value && value !== "Not Found" ? value : null;
}

// Second whitelist: each infection becomes a new object built field by field.
export function toRecords(raw: HudsonRockResponse): SourceRecord[] {
  return raw.stealers.map((s) => {
    const date = known(s.date_compromised)?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
    const counts = [s.total_user_services, s.total_corporate_services].filter((n) => typeof n === "number");
    return {
      about: "subject",
      fields: [
        {
          field: "H5",
          value: date ?? "Date inconnue",
          infection: {
            date,
            operatingSystem: known(s.operating_system),
            stolenCredentials: counts.length > 0 ? counts.reduce((a, b) => a + b, 0) : null,
          },
        },
      ],
      identifiers: [],
    };
  });
}
