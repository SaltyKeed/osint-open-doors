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
const DIGITS_ONLY = /^[+\d\s./()-]+$/;
const NAME = /^[\p{L}'’-]+(\s+[\p{L}'’-]+){1,3}$/u;
const HANDLE = /^[A-Za-z0-9._-]{3,40}$/;
const PLAIN_WORD = /^[A-Za-z]+$/;
const WORD_WITH_ACCENTS = /^[\p{L}'’-]{2,}$/u;

function clean(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function detect(raw: string): Detected | null {
  const value = clean(raw);
  if (value === "") return null;

  if (EMAIL.test(value)) return { type: "email", value, alternatives: ["email"] };
  if (YEAR.test(value)) return { type: "birthYear", value, alternatives: ["birthYear"] };
  // Only digits and signs: a phone number or nothing, never a username (it would be
  // sent to hundreds of sites).
  if (DIGITS_ONLY.test(value)) {
    return parsePhoneNumberFromString(value, "CH")?.isValid() ? { type: "phone", value, alternatives: ["phone"] } : null;
  }
  if (NAME.test(value)) return { type: "name", value, alternatives: ["name", "city"] };
  if (HANDLE.test(value)) {
    // "Neuchatel" could be a username or a city: the visitor can switch.
    return { type: "username", value, alternatives: PLAIN_WORD.test(value) ? ["username", "city"] : ["username"] };
  }
  if (WORD_WITH_ACCENTS.test(value)) return { type: "city", value, alternatives: ["city", "username"] };
  return null;
}

// Why an entry was not recognized, in the visitor's words.
export function explainUnknown(raw: string): string {
  const value = clean(raw);
  if (DIGITS_ONLY.test(value)) {
    return "Ce numéro n'est pas reconnu. Tape-le avec le 0 ou l'indicatif : 079 123 45 67 ou +41 79 123 45 67.";
  }
  if (value.includes("@")) return "Cette adresse email n'est pas complète. Vérifie-la, par exemple prenom.nom@exemple.ch.";
  return `« ${value} » n'est pas reconnu. Essaie un email, un numéro suisse, ton prénom et ton nom, ou un pseudo sans espace.`;
}

// A single capitalized word was taken as a username: the visitor may have wanted a name.
export function looksLikeLoneName(entry: Detected): boolean {
  return entry.type === "username" && /^\p{Lu}\p{Ll}+$/u.test(entry.value);
}

// A list typed or pasted at once becomes several entries.
export function splitEntries(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

// Name split: the first `firstNameWords` words are the first name, unless the order
// is reversed ("Dupont Jean"). Defaults: one first-name word, first name first.
export type NameSplit = { firstNameWords: number; lastFirst: boolean };

export function splitName(value: string, split: NameSplit = { firstNameWords: 1, lastFirst: false }) {
  const words = value.trim().split(/\s+/);
  const k = Math.min(Math.max(split.firstNameWords, 1), Math.max(words.length - 1, 1));
  if (split.lastFirst) {
    return { lastName: words.slice(0, words.length - k).join(" "), firstName: words.slice(words.length - k).join(" ") };
  }
  return { firstName: words.slice(0, k).join(" "), lastName: words.slice(k).join(" ") };
}
