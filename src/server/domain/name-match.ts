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

/**
 * Stricter than nameMatches, for a page that may list many people (T6): the words of the name follow each
 * other, in order or reversed. "Léa Dupont, Paul Martin" holds "Léa" and "Martin", not "Léa Martin".
 */
export function nameSideBySide(text: string, name: string): boolean {
  const wanted = words(name);
  if (wanted.length < 2) return false;
  const present = words(text);
  const follows = (sequence: string[]) =>
    present.some((_, i) => sequence.every((word, j) => present[i + j] === word));
  return follows(wanted) || follows([...wanted].reverse());
}
