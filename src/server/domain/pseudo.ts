import "server-only";

const MIN_LENGTH = 6;

/**
 * First filter for a pseudo found by a source: too short or without a letter, it is
 * shared by many people (CADRAGE.md, section 7). A common word like "thomas" passes
 * here; the engine catches it by the number of sites where it exists (#65).
 * Expects a pseudo already normalized by normalizeIdentifier (lowercase, no "@").
 */
export function isRarePseudo(pseudo: string): boolean {
  return pseudo.length >= MIN_LENGTH && /[a-z]/.test(pseudo);
}
