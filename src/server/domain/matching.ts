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
