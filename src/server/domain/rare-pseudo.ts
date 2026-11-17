import "server-only";
import { fold } from "./identifier";

/** Above this number of sites, a pseudo is shared by many people. To tune during the trials. */
export const ABNORMAL_SITE_COUNT = 25;

// Starter list. To replace with the frozen lists of first names (OFS) and
// common words (fr, en, de) chosen by Enzo on 2026-11-17.
const STARTER_COMMON = new Set([
  "admin", "alex", "anna", "dragon", "gamer", "julien", "laura", "lucas", "marie", "master",
  "nicolas", "player", "shadow", "sunshine", "thomas", "test", "user",
]);

/**
 * CADRAGE.md, section 7 and D25: at least 6 characters without separators, the
 * letters left once digits are removed are not a first name or a common word
 * alone, and the pseudo is not found on an abnormal number of sites.
 */
export function isRarePseudo(
  pseudo: string,
  options: { common?: ReadonlySet<string>; sitesFound?: number } = {},
): boolean {
  const common = options.common ?? STARTER_COMMON;
  const compact = fold(pseudo).replace(/[._\-\s]/g, "");
  if (compact.length < 6) return false;
  const letters = compact.replace(/\d/g, "");
  if (letters.length === 0 || common.has(letters)) return false;
  return (options.sitesFound ?? 0) <= ABNORMAL_SITE_COUNT;
}
