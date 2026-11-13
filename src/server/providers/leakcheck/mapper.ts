import "server-only";
import { z } from "zod";
import type { AccountFinding, BreachFinding, CountFinding, DataCategory } from "@/server/domain/types";

export const PROVIDER_ID = "leakcheck";

// Shape of GET https://leakcheck.io/api/public?check=... (fields we use).
// "fields" lists the data types found in all the sources together, not per source.
export const publicSchema = z.union([
  z.object({
    success: z.literal(true),
    found: z.number(),
    fields: z.array(z.string()).default([]),
    sources: z.array(z.object({ name: z.string(), date: z.string().default("") })).default([]),
  }),
  z.object({ success: z.literal(false) }),
]);

// LeakCheck vocabulary -> domain categories. Unknown fields become "other".
const CATEGORY_MAP: Record<string, DataCategory> = {
  username: "username",
  profile_name: "username",
  password: "password",
  email: "email",
  phone: "phone",
  dob: "birthDate",
  day: "birthDate",
  month: "birthDate",
  year: "birthDate",
  address: "address",
  address1: "address",
  zip: "address",
  city: "location",
  state: "location",
  region: "location",
  country: "location",
  ip: "ipAddress",
  ip1: "ipAddress",
  ip2: "ipAddress",
  first_name: "name",
  last_name: "name",
  middle_name: "name",
  name: "name",
  ssn: "governmentId",
};

function toCategories(fields: string[]): DataCategory[] {
  return [...new Set(fields.map((f) => CATEGORY_MAP[f] ?? "other"))];
}

// Whitelist: name and year of each source; the exposed data types as categories only.
export function toEmailFindings(raw: unknown): (BreachFinding | AccountFinding)[] {
  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.success || parsed.data.sources.length === 0) return [];
  const { sources, fields } = parsed.data;
  const breaches: BreachFinding[] = sources.map((s) => ({
    kind: "breach",
    providerId: PROVIDER_ID,
    source: s.name,
    year: /^\d{4}/.test(s.date) ? s.date.slice(0, 4) : undefined,
    // Per source, only the email is sure: "fields" mixes all the sources.
    categories: ["email"],
    matchedOn: "email",
  }));
  const categories = toCategories(fields);
  if (categories.length === 0) return breaches;
  return [
    ...breaches,
    {
      kind: "account",
      providerId: PROVIDER_ID,
      service: "LeakCheck : données exposées",
      summary:
        `Dans les fuites qui contiennent ton email, LeakCheck a trouvé ${categories.length} types de données. ` +
        "Seul le type est affiché, jamais la valeur.",
      categories,
      matchedOn: "email",
    },
  ];
}

// A username can be shared by many people: only a total is shown (lead, not proof).
export function toUsernameFindings(raw: unknown, username: string): CountFinding[] {
  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.success || parsed.data.sources.length === 0) return [];
  return [
    {
      kind: "count",
      providerId: PROVIDER_ID,
      source: "LeakCheck",
      count: parsed.data.sources.length,
      label: `fuites contiennent un compte « ${username} » (peut-être quelqu'un d'autre)`,
      matchedOn: "username",
    },
  ];
}
