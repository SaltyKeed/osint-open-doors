import "server-only";
import { normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";

/** An account found with a pseudo, by WhatsMyName or by a platform API. */
export interface PlatformAccount {
  site: string;
  category: string;
  url: string;
  /** Neutral facts only (creation year, country, activity): never a name, bio or photo. */
  details: string[];
}

/** One F2 value per account, and its address as a PROFIL to pivot on (archives, other sources). */
export function toPlatformRecord(account: PlatformAccount, pseudo: Identifier): SourceRecord {
  const profile = normalizeIdentifier("PROFIL", account.url);
  return {
    origin: account.site,
    evidence: account.url,
    values: [
      {
        field: "F2",
        value: account.url,
        attributes: [
          { label: "Service", value: account.site, known: true },
          { label: "Catégorie", value: account.category, known: true },
          { label: "Pseudo", value: pseudo.value, known: true },
          ...account.details.map((value) => ({ label: "Détail", value, known: true })),
        ],
      },
    ],
    identifiers: profile ? [{ identifier: profile }] : [],
  };
}
