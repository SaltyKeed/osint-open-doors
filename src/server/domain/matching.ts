import { nationalDigits } from "./phone";
import type { QueryKind, SearchQuery } from "./types";

// Anti-homonym rule (CLAUDE.md): a result is linked to the visitor only when it
// contains the visitor's email or phone number. A name alone is never enough.
export function strongMatch(
  text: string,
  query: Pick<SearchQuery, "email" | "phone">,
): Extract<QueryKind, "email" | "phone"> | null {
  if (query.email && text.toLowerCase().includes(query.email.toLowerCase())) return "email";
  if (query.phone && text.replace(/\D/g, "").includes(nationalDigits(query.phone))) return "phone";
  return null;
}

// Lower case, without accents: "Hélène" -> "helene".
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The full name must appear together, in either order:
// "Enzo Pachoud", "Pachoud Enzo", "PACHOUD, Enzo". A page that only contains
// the first name or only the last name is not about this person.
export function containsFullName(text: string, firstName: string, lastName: string): boolean {
  const first = escapeRegExp(fold(firstName.trim()));
  const last = escapeRegExp(fold(lastName.trim()));
  const sep = "[\\s,.\\-]+";
  const pattern = new RegExp(`(^|[^\\p{L}])(${first}${sep}${last}|${last}${sep}${first})($|[^\\p{L}])`, "u");
  return pattern.test(fold(text));
}

// Full name or initial forms, always together with the last name:
// "E. Pachoud", "E Pachoud", "Pachoud E.", "Pachoud, E." (D18).
export function containsNameOrInitial(text: string, firstName: string, lastName: string): boolean {
  if (containsFullName(text, firstName, lastName)) return true;
  const initial = escapeRegExp(fold(firstName.trim()).charAt(0));
  const last = escapeRegExp(fold(lastName.trim()));
  if (!initial) return false;
  const pattern = new RegExp(
    `(^|[^\\p{L}])(${initial}\\.?\\s+${last}|${last},?\\s+${initial}\\.)($|[^\\p{L}])`,
    "u",
  );
  return pattern.test(fold(text));
}

// Context that makes a name-only page "probable": the visitor's city or birth year.
export function contextMatch(text: string, query: Pick<SearchQuery, "city" | "birthYear">): string | null {
  const folded = fold(text);
  if (query.city) {
    const city = escapeRegExp(fold(query.city.trim()));
    if (city && new RegExp(`(^|[^\\p{L}])${city}($|[^\\p{L}])`, "u").test(folded)) return "localité";
  }
  if (query.birthYear && new RegExp(`(^|\\D)${query.birthYear}($|\\D)`).test(folded)) return "année de naissance";
  return null;
}
