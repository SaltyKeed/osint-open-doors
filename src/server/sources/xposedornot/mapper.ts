import "server-only";
import { z } from "zod";
import type { Identifier } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";
import type { DataCategory, Exposure } from "@/server/domain/types";

const CATEGORY_LABELS: Record<DataCategory, string> = {
  email: "email",
  password: "mot de passe",
  phone: "téléphone",
  name: "nom",
  address: "adresse",
  birthdate: "date de naissance",
  username: "pseudo",
  ip: "adresse IP",
  other: "autres",
};

/** One H1 value per breach; the breach name is the origin (two services, one breach = one proof). */
export function toXposedRecords(exposures: readonly Exposure[], email: Identifier): SourceRecord[] {
  return exposures.map((e) => ({
    origin: e.source,
    evidence: null,
    values: [
      {
        field: "H1",
        value: e.source,
        attributes: [
          ...(e.year !== null ? [{ label: "Année", value: String(e.year), known: true }] : []),
          { label: "Données exposées", value: e.categories.map((c) => CATEGORY_LABELS[c]).join(", "), known: true },
          ...(e.recordCount !== null ? [{ label: "Comptes touchés", value: String(e.recordCount), known: true }] : []),
        ],
      },
    ],
    identifiers: [{ identifier: email }],
  }));
}

// GET /v1/check-email/{email}: breach names only, sometimes breaches that the
// analytics route does not list. { breaches: [[names]] } or { Error: "Not found" }.
export const checkEmailSchema = z.object({ breaches: z.array(z.array(z.string())).optional() });

export type CheckEmailAnswer = z.infer<typeof checkEmailSchema>;

/** Breaches of check-email that the analytics route did not already give (compared without case). */
export function toCheckEmailRecords(
  answer: CheckEmailAnswer,
  email: Identifier,
  already: ReadonlySet<string>,
): SourceRecord[] {
  const names = [...new Set((answer.breaches ?? []).flat())].filter((n) => !already.has(n.toLowerCase()));
  return names.map((name) => ({
    origin: name,
    evidence: null,
    values: [{ field: "H1", value: name }],
    identifiers: [{ identifier: email }],
  }));
}
