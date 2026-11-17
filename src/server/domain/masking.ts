import "server-only";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { FieldCode } from "./fiche-fields";

// Always the same number of dots, so the mask does not reveal the length of the value.
const HIDDEN = "•••";

/** Expects a phone already normalized by normalizeSwissPhone (+41XXXXXXXXX). */
export function maskPhone(normalized: string): string {
  const match = /^\+41(\d{2})\d{5}(\d{2})$/.exec(normalized);
  return match ? `+41 ${match[1]} ••• •• ${match[2]}` : HIDDEN;
}

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return HIDDEN;
  return `${email[0]}${HIDDEN}${email.slice(at)}`;
}

/** Masked form shown before the "eye" button is pressed (D19, T1). */
export function maskValue(field: FieldCode, value: string): string {
  switch (field) {
    case "B1":
      return maskEmail(value);
    case "B2": {
      if (value.startsWith("+41")) return maskPhone(value);
      const phone = parsePhoneNumberFromString(value);
      return phone ? `+${phone.countryCallingCode} ${HIDDEN} ${phone.number.slice(-2)}` : HIDDEN;
    }
    case "H3":
      return HIDDEN;
    case "H4": {
      const first = value.split(/[.:]/)[0];
      return first && value.includes(".") ? `${first}.${HIDDEN}.${HIDDEN}.${HIDDEN}` : HIDDEN;
    }
    default:
      return value.length > 0 ? `${value[0]}${HIDDEN}` : HIDDEN;
  }
}
