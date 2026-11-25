import "server-only";

/** Lowercase words without accents; letters, digits and hyphens stay inside a word (T10). */
function words(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}-]+/u)
    .filter((word) => word !== "");
}

/**
 * True when every word of the confirmed name (first name and last name, at least two) is a whole word of
 * the displayed name. "Léa Martin (@lmartin_06) • Instagram" matches "Lea Martin"; "Léa Martinez" does not.
 */
export function nameMatches(displayed: string, confirmed: string): boolean {
  const wanted = words(confirmed);
  if (wanted.length < 2) return false;
  const present = new Set(words(displayed));
  return wanted.every((word) => present.has(word));
}
