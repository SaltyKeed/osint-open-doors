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
