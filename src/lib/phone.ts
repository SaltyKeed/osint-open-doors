import { parsePhoneNumberFromString } from "libphonenumber-js";

// Phone numbers are parsed with libphonenumber-js (Google's rules), Switzerland by default.

export function normalizePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "CH");
  return parsed?.isValid() ? parsed.number : null;
}

// Ways a number is commonly written on the web: each one is searched.
export function phoneSearchVariants(e164: string): string[] {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return [e164];
  const national = parsed.formatNational(); // "079 123 45 67"
  return [
    parsed.formatInternational(), // "+41 79 123 45 67"
    national,
    national.replace(/\D/g, ""), // "0791234567"
    parsed.number, // "+41791234567"
  ];
}

// Significant digits, used to find the number in any format inside a text.
export function nationalDigits(e164: string): string {
  return parsePhoneNumberFromString(e164)?.nationalNumber ?? e164.replace(/\D/g, "");
}
