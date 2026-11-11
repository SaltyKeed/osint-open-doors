import { findPhoneNumbersInText, parsePhoneNumberFromString } from "libphonenumber-js";
import { phoneSearchVariants } from "./phone";
import type { SearchQuery } from "./types";

// Masks personal values before they are displayed (CLAUDE.md invariant).

const MASK = "•";

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return MASK.repeat(3);

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length === 1) return `${local}@${domain}`;
  if (local.length === 2) return `${local[0]}${MASK}@${domain}`;

  const middle = MASK.repeat(local.length - 2);
  return `${local[0]}${middle}${local[local.length - 1]}@${domain}`;
}

// "+41 79 123 45 67" -> "+41 79 ••• •• 67"
export function maskPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return MASK.repeat(3);
  const groups = parsed.formatInternational().split(" ");
  return groups
    .map((group, index) => {
      if (index <= 1 || index === groups.length - 1) return group;
      return MASK.repeat(group.length);
    })
    .join(" ");
}

// "Jean", "Dupont" -> "J••• D•••••"
export function maskName(...parts: string[]): string {
  return parts
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]}${MASK.repeat(part.length - 1)}`)
    .join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Masks every email and phone number inside a text, whoever they belong to:
// page titles and snippets may contain the contact details of homonyms.
export function maskContacts(text: string): string {
  let masked = text.replace(EMAIL_IN_TEXT, (email) => maskEmail(email));
  const phones = findPhoneNumbersInText(masked, "CH");
  // Replace from the end so the earlier positions stay valid.
  for (const found of [...phones].reverse()) {
    masked = masked.slice(0, found.startsAt) + maskPhone(found.number.number) + masked.slice(found.endsAt);
  }
  return masked;
}

// Masks the visitor's own email and phone inside a text (page title, summary...).
export function maskInText(text: string, query: Pick<SearchQuery, "email" | "phone">): string {
  let masked = text;
  if (query.email) {
    masked = masked.replace(new RegExp(escapeRegExp(query.email), "gi"), maskEmail(query.email));
  }
  if (query.phone) {
    for (const variant of phoneSearchVariants(query.phone)) {
      masked = masked.replaceAll(variant, maskPhone(query.phone));
    }
  }
  return masked;
}
