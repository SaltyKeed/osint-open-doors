import "server-only";
import { z } from "zod";
import type { BreachFinding, CountFinding, DataCategory, QueryKind } from "@/server/domain/types";

export const PROVIDER_ID = "dehashed";

// Shape of POST api.dehashed.com/v2/search (D31), from the dehashed-rs client. Every
// field holds values (passwords, addresses...): the schema keeps them only so that the
// mapper can see WHICH fields are filled. No value ever leaves this file.
const values = z.array(z.string()).nullish();

export const responseSchema = z.object({
  balance: z.number().optional(),
  total: z.number().default(0),
  entries: z
    .array(
      z.object({
        database_name: z.string().default(""),
        email: values,
        ip_address: values,
        username: values,
        password: values,
        hashed_password: values,
        name: values,
        dob: values,
        license_plate: values,
        address: values,
        phone: values,
        company: values,
        url: values,
        social: values,
        cryptocurrency_address: values,
      }),
    )
    .nullish(),
});

type Entry = NonNullable<z.infer<typeof responseSchema>["entries"]>[number];

// DeHashed fields -> domain categories (only the presence of the field is used).
const FIELD_CATEGORIES: [keyof Entry, DataCategory][] = [
  ["password", "password"],
  ["hashed_password", "password"],
  ["cryptocurrency_address", "financial"],
  ["address", "address"],
  ["phone", "phone"],
  ["dob", "birthDate"],
  ["ip_address", "ipAddress"],
  ["company", "work"],
  ["social", "social"],
  ["url", "social"],
  ["license_plate", "activity"],
  ["name", "name"],
  ["username", "username"],
  ["email", "email"],
];

function filled(entry: Entry, field: keyof Entry): boolean {
  const value = entry[field];
  return Array.isArray(value) && value.some((v) => v.trim() !== "");
}

function categoriesOf(entries: Entry[]): DataCategory[] {
  const categories = FIELD_CATEGORIES.filter(([field]) => entries.some((e) => filled(e, field))).map(([, c]) => c);
  return [...new Set(categories)];
}

// One breach per database, with the kinds of data found in the visitor's records.
function toBreaches(entries: Entry[], matchedOn: QueryKind): BreachFinding[] {
  const byDatabase = new Map<string, Entry[]>();
  for (const entry of entries) {
    const name = entry.database_name.trim() || "Base inconnue";
    byDatabase.set(name, [...(byDatabase.get(name) ?? []), entry]);
  }
  return [...byDatabase].map(([source, group]) => ({
    kind: "breach",
    providerId: PROVIDER_ID,
    source,
    categories: categoriesOf(group),
    matchedOn,
  }));
}

function parse(raw: unknown): Entry[] {
  const parsed = responseSchema.safeParse(raw);
  return parsed.success ? (parsed.data.entries ?? []) : [];
}

// Records found with the email or the phone: they are the visitor's.
export function toFindings(raw: unknown, matchedOn: "email" | "phone"): BreachFinding[] {
  return toBreaches(parse(raw), matchedOn);
}

const digits = (value: string) => value.replace(/\D/g, "");

// Records found by name: kept only when they also hold the visitor's email or phone
// (anti-homonym rule, ARCHITECTURE.md section 2). The others are only counted.
export function toNameFindings(
  raw: unknown,
  visitor: { email?: string; phone?: string },
): (BreachFinding | CountFinding)[] {
  const entries = parse(raw);
  const email = visitor.email?.toLowerCase();
  const phone = visitor.phone ? digits(visitor.phone) : undefined;
  const isVisitor = (e: Entry) =>
    (email !== undefined && (e.email ?? []).some((v) => v.trim().toLowerCase() === email)) ||
    (phone !== undefined && phone.length >= 8 && (e.phone ?? []).some((v) => digits(v).endsWith(phone.slice(-9))));
  const own = entries.filter(isVisitor);
  const others = entries.length - own.length;
  return [
    ...toBreaches(own, "name"),
    ...(others > 0
      ? [
          {
            kind: "count" as const,
            providerId: PROVIDER_ID,
            source: "DeHashed",
            count: others,
            label: "fiches de bases volées portent ce nom (sûrement des homonymes)",
            matchedOn: "name" as const,
          },
        ]
      : []),
  ];
}

// A username can be shared by many people: only a total is shown (lead, not proof).
export function toUsernameFindings(raw: unknown, username: string): CountFinding[] {
  const entries = parse(raw);
  const databases = new Set(entries.map((e) => e.database_name)).size;
  if (databases === 0) return [];
  return [
    {
      kind: "count",
      providerId: PROVIDER_ID,
      source: "DeHashed",
      count: databases,
      label: `bases volées contiennent un compte « ${username} » (peut-être quelqu'un d'autre)`,
      matchedOn: "username",
    },
  ];
}
