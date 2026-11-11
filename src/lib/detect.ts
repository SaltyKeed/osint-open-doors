import { parsePhoneNumberFromString } from "libphonenumber-js";

// Automatic recognition of what the visitor types in the single search bar.
// Runs in the browser while typing; the server validates again (route.ts).

export type EntryType = "email" | "phone" | "name" | "username" | "city" | "birthYear";

export type Detected = {
  type: EntryType;
  value: string;
  // Types the visitor can switch to when the guess is ambiguous (first = current guess).
  alternatives: EntryType[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const YEAR = /^(19|20)\d{2}$/;
const PHONE_LIKE = /^[+0(][\d\s./()-]{6,}$/;
const NAME = /^[\p{L}'’-]+(\s+[\p{L}'’-]+){1,3}$/u;
const HANDLE = /^[A-Za-z0-9._-]{3,40}$/;
const PLAIN_WORD = /^[A-Za-z]+$/;
const WORD_WITH_ACCENTS = /^[\p{L}'’-]{2,}$/u;

export function detect(raw: string): Detected | null {
  const value = raw.trim().replace(/\s+/g, " ");
  if (value === "") return null;

  if (EMAIL.test(value)) return { type: "email", value, alternatives: ["email"] };
  if (YEAR.test(value)) return { type: "birthYear", value, alternatives: ["birthYear"] };
  if (PHONE_LIKE.test(value) && parsePhoneNumberFromString(value, "CH")?.isValid()) {
    return { type: "phone", value, alternatives: ["phone"] };
  }
  if (NAME.test(value)) return { type: "name", value, alternatives: ["name", "city"] };
  if (HANDLE.test(value)) {
    // "Neuchatel" could be a username or a city: the visitor can switch.
    return { type: "username", value, alternatives: PLAIN_WORD.test(value) ? ["username", "city"] : ["username"] };
  }
  if (WORD_WITH_ACCENTS.test(value)) return { type: "city", value, alternatives: ["city", "username"] };
  return null;
}

// A pasted list becomes several entries.
export function splitEntries(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

// "Jean Dupont" -> first name "Jean", last name "Dupont" (the rest).
export function splitName(value: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = value.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}
