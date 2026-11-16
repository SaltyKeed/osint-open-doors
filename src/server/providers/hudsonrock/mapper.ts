import "server-only";
import { z } from "zod";
import type { AccountFinding, CountFinding } from "@/server/domain/types";

export const PROVIDER_ID = "hudsonrock";

// Shape of GET cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email (fields
// we use). The answer also holds masked passwords, logins, an IP and a computer name:
// they are not in the schema, so zod drops them before the mapper sees anything.
export const stealerSchema = z.object({
  stealers: z
    .array(
      z.object({
        date_compromised: z.string().optional(),
        stealer_family: z.string().optional(),
        total_user_services: z.number().optional(),
        total_corporate_services: z.number().optional(),
      }),
    )
    .default([]),
});

type Stealer = z.infer<typeof stealerSchema>["stealers"][number];

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// "2026-11-11T00:54:00.000Z" -> "novembre 2026". The day is not shown.
function monthYear(iso: string | undefined): string | undefined {
  const match = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${month} ${match[1]}` : undefined;
}

function latest(stealers: Stealer[]): Stealer | undefined {
  return [...stealers].sort((a, b) => (b.date_compromised ?? "").localeCompare(a.date_compromised ?? ""))[0];
}

// "Generic Stealer" says nothing to a visitor: only real family names are kept.
function families(stealers: Stealer[]): string[] {
  const names = stealers.map((s) => s.stealer_family?.trim() ?? "").filter((n) => n !== "" && !/generic/i.test(n));
  return [...new Set(names)].slice(0, 3);
}

// An infostealer copies everything the browser saved. Whitelist: number of infected
// computers, month of the last infection, malware family, number of saved accounts.
export function toEmailFindings(raw: unknown): AccountFinding[] {
  const parsed = stealerSchema.safeParse(raw);
  if (!parsed.success || parsed.data.stealers.length === 0) return [];
  const { stealers } = parsed.data;
  const last = latest(stealers);
  const when = monthYear(last?.date_compromised);
  const accounts = stealers.reduce(
    (sum, s) => sum + (s.total_user_services ?? 0) + (s.total_corporate_services ?? 0),
    0,
  );
  const names = families(stealers);
  const computers = stealers.length > 1 ? `${stealers.length} ordinateurs infectés` : "un ordinateur infecté";
  return [
    {
      kind: "account",
      providerId: PROVIDER_ID,
      service: "Ordinateur infecté par un voleur de mots de passe",
      summary:
        `Ton adresse était enregistrée dans le navigateur d'${computers} par un logiciel espion (infostealer)` +
        `${when ? `, dernière infection en ${when}` : ""}` +
        `${names.length > 0 ? ` (${names.join(", ")})` : ""}. ` +
        `${accounts > 0 ? `${accounts.toLocaleString("fr-CH")} comptes enregistrés ont été copiés avec leur mot de passe. ` : ""}` +
        "L'ordinateur peut être le tien ou celui de quelqu'un chez qui tu t'es connecté.",
      categories: ["email", "password", "username"],
      matchedOn: "email",
    },
  ];
}

// Shape of GET .../osint-tools/search-by-domain (totals only). The answer also lists the
// login pages of the organization: not in the schema, never shown.
export const domainSchema = z.object({
  total: z.number().default(0),
  employees: z.number().default(0),
  users: z.number().default(0),
});

// Organization of the email (employer, school): how many infected computers held one of
// its accounts. Totals only, the people are not identified.
export function toDomainFindings(raw: unknown, domain: string): AccountFinding[] {
  const parsed = domainSchema.safeParse(raw);
  if (!parsed.success || parsed.data.total === 0) return [];
  const { total, employees, users } = parsed.data;
  const fmt = (n: number) => n.toLocaleString("fr-CH");
  return [
    {
      kind: "account",
      providerId: PROVIDER_ID,
      service: `Organisation ${domain} : ordinateurs infectés`,
      summary:
        `${fmt(total)} ordinateurs infectés par un voleur de mots de passe contenaient un compte lié à ${domain}` +
        ` (comptes de ${fmt(employees)} membres de l'organisation et de ${fmt(users)} utilisateurs de ses services). ` +
        "Tes collègues ou camarades peuvent être touchés : un pirate peut s'en servir pour entrer dans le réseau.",
      categories: ["email", "password"],
      matchedOn: "email",
    },
  ];
}

// A username can be shared by many people: only a total is shown (lead, not proof).
export function toUsernameFindings(raw: unknown, username: string): CountFinding[] {
  const parsed = stealerSchema.safeParse(raw);
  if (!parsed.success || parsed.data.stealers.length === 0) return [];
  return [
    {
      kind: "count",
      providerId: PROVIDER_ID,
      source: "Hudson Rock",
      count: parsed.data.stealers.length,
      label: `ordinateurs infectés contenaient un compte « ${username} » (peut-être quelqu'un d'autre)`,
      matchedOn: "username",
    },
  ];
}
