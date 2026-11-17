import "server-only";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

// An identifier is a value that can be given to a source (CADRAGE.md, 6.1).
// It is normalized once, here: "079 123 45 67" and "+41791234567" must be the
// same identifier, otherwise the "already seen" list cannot stop the loop.

export const IDENTIFIER_TYPES = ["EMAIL", "TEL", "PSEUDO", "NOM", "PROFIL", "DOMAINE", "IP", "ORGA"] as const;
export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

/** Identifiers that designate one person: a match on them is not a namesake. */
export const UNIQUE_TYPES: ReadonlySet<IdentifierType> = new Set(["EMAIL", "TEL", "PROFIL", "DOMAINE"]);

export interface Identifier {
  type: IdentifierType;
  /** Normalized value. */
  value: string;
}

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

/** Lowercase without accents: "Léa" and "LEA" compare equal. */
export function fold(s: string): string {
  return collapse(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function normalizeDomain(raw: string): string | null {
  const host = raw.trim().replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0] ?? "";
  const value = host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(value) ? value : null;
}

function normalizeProfile(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return `https://${host}${url.pathname.replace(/\/+$/, "")}`;
}

const NORMALIZERS: Record<IdentifierType, (raw: string) => string | null> = {
  EMAIL: (raw) => {
    const value = raw.trim().toLowerCase();
    return z.email().safeParse(value).success ? value : null;
  },
  TEL: (raw) => {
    const phone = parsePhoneNumberFromString(raw, "CH");
    return phone?.isValid() ? phone.number : null;
  },
  PSEUDO: (raw) => {
    const value = raw.trim().replace(/^@/, "").toLowerCase();
    return /^\S{1,64}$/.test(value) ? value : null;
  },
  NOM: (raw) => {
    const value = collapse(raw);
    return value.length > 0 ? value : null;
  },
  PROFIL: normalizeProfile,
  DOMAINE: normalizeDomain,
  IP: (raw) => {
    const value = raw.trim();
    return z.union([z.ipv4(), z.ipv6()]).safeParse(value).success ? value.toLowerCase() : null;
  },
  ORGA: (raw) => {
    const value = collapse(raw);
    return value.length > 0 ? value : null;
  },
};

/** Returns null when the raw value is not a valid identifier of this type. */
export function normalizeIdentifier(type: IdentifierType, raw: string): Identifier | null {
  const value = NORMALIZERS[type](raw);
  return value === null ? null : { type, value };
}

/** "Léa Martin" and "MARTIN Lea" give "lea martin". */
export function nameKey(name: string): string {
  return fold(name).split(" ").sort().join(" ");
}

/** Key for the "already seen" set and for merging: equal keys = same identifier. */
export function identifierKey({ type, value }: Identifier): string {
  if (type === "NOM") return `NOM:${nameKey(value)}`;
  if (type === "ORGA") return `ORGA:${fold(value)}`;
  return `${type}:${value}`;
}
