import "server-only";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { HIDDEN, maskEmail, maskPhone } from "@/lib/masking";
import type { FieldCode } from "./fiche-fields";

// The simple masks live in src/lib: the search bar uses them in the browser too.
export { maskEmail, maskPhone };

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
