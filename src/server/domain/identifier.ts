import "server-only";
import { z } from "zod";
import { normalizeEmail, normalizeSwissPhone } from "./search-query";

/** Kinds of value the investigation can give to a source (CADRAGE.md, section 6.1). */
export const IDENTIFIER_TYPES = ["EMAIL", "TEL", "PSEUDO", "NOM", "PROFIL", "DOMAINE", "IP", "ORGA"] as const;

export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export interface Identifier {
  type: IdentifierType;
  value: string;
}

const emailSchema = z.email();
const ipSchema = z.union([z.ipv4(), z.ipv6()]);
const hostnameSchema = z.hostname();

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ");
}

/** "HTTPS://GitHub.com/user/" becomes "https://github.com/user"; only http and https are accepted. */
function normalizeProfileUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

function normalizeValue(type: IdentifierType, value: string): string | null {
  switch (type) {
    case "EMAIL": {
      const email = normalizeEmail(value);
      return emailSchema.safeParse(email).success ? email : null;
    }
    case "TEL":
      // shortcut: Swiss numbers only; switch to libphonenumber-js when a source returns foreign numbers.
      return normalizeSwissPhone(value);
    case "PSEUDO":
      return value.replace(/^@/, "").toLowerCase() || null;
    case "NOM":
    case "ORGA":
      return collapseSpaces(value);
    case "PROFIL":
      return normalizeProfileUrl(value);
    case "DOMAINE": {
      const domain = value.toLowerCase().replace(/^www\./, "");
      return domain.includes(".") && hostnameSchema.safeParse(domain).success ? domain : null;
    }
    case "IP":
      return ipSchema.safeParse(value).success ? value : null;
  }
}

/** Returns null for an invalid value. Never throws: an error message could contain the visitor's input. */
export function normalizeIdentifier(type: IdentifierType, raw: string): Identifier | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = normalizeValue(type, trimmed);
  return value === null ? null : { type, value };
}

/** Unique key for the "already seen" list: the type is part of it, a pseudo and a name never collide. */
export function identifierKey(id: Identifier): string {
  return `${id.type}:${id.value}`;
}
