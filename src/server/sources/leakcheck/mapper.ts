import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";
import type { LeakCheckPublic } from "./schema";

const FIELD_LABELS: Record<string, string> = {
  username: "pseudo",
  password: "mot de passe",
  phone: "téléphone",
  address: "adresse",
  city: "ville",
  country: "pays",
  zip: "code postal",
  dob: "date de naissance",
  first_name: "prénom",
  last_name: "nom",
  middle_name: "deuxième prénom",
  name: "nom complet",
  ip: "adresse IP",
  ip1: "adresse IP",
  ip2: "adresse IP",
  gender: "sexe",
  company_name: "entreprise",
  profile_name: "nom de profil",
};

/** One H1 value per breach (the breach is the origin), plus one H2 value listing the data types. */
export function toLeakCheckRecords(body: LeakCheckPublic, queried: Identifier): SourceRecord[] {
  if (!body.success || !body.sources?.length) return [];
  const identifiers = [{ identifier: queried }];
  const breaches: SourceRecord[] = body.sources.map((s) => ({
    origin: s.name,
    evidence: null,
    values: [
      {
        field: "H1",
        value: s.name,
        attributes: s.date ? [{ label: "Date", value: s.date, known: true }] : [],
      },
    ],
    identifiers,
  }));
  const fields = [...new Set((body.fields ?? []).map((f) => FIELD_LABELS[f] ?? f))];
  if (fields.length === 0) return breaches;
  return [
    ...breaches,
    {
      origin: "LeakCheck",
      evidence: null,
      values: [{ field: "H2", value: `Données présentes dans ces fuites : ${fields.join(", ")}` }],
      identifiers,
    },
  ];
}
