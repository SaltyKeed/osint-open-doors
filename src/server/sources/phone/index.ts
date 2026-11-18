import "server-only";
// The "max" metadata is needed to know the kind of line (mobile, fixed…).
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import type { Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";

const LINE_TYPES: Record<string, string> = {
  MOBILE: "mobile",
  FIXED_LINE: "fixe",
  FIXED_LINE_OR_MOBILE: "fixe ou mobile",
  VOIP: "téléphonie internet (VoIP)",
  TOLL_FREE: "numéro gratuit",
  PREMIUM_RATE: "numéro surtaxé",
  PAGER: "bipeur",
  UAN: "numéro d'entreprise",
};

const countries = new Intl.DisplayNames(["fr"], { type: "region" });

/** Country and kind of line of a number, computed locally (SOURCES.md, section 8). */
export function analysePhone(phone: Identifier): SourceRecord | null {
  const parsed = parsePhoneNumberFromString(phone.value);
  if (!parsed) return null;
  const type = parsed.getType();
  return {
    origin: "Analyse du numéro",
    evidence: null,
    values: [
      {
        field: "B2",
        value: phone.value,
        attributes: [
          ...(parsed.country ? [{ label: "Pays", value: countries.of(parsed.country) ?? parsed.country, known: true }] : []),
          ...(type && LINE_TYPES[type] ? [{ label: "Type de ligne", value: LINE_TYPES[type], known: true }] : []),
        ],
      },
    ],
    identifiers: [{ identifier: phone }],
  };
}

export const phoneAnalysis: Source = {
  id: "phone",
  label: "Analyse du numéro",
  accepts: ["TEL"],
  requiredEnv: [],
  async run(phone) {
    const record = analysePhone(phone);
    return found(record ? [record] : []);
  },
};
