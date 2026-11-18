// Masks shared by the server (fiche values) and the browser (tags of the search bar).
// No personal data is kept here: pure functions only.

// Always the same number of dots, so the mask does not reveal the length of the value.
export const HIDDEN = "•••";

/** Expects a phone already normalized (+41XXXXXXXXX). */
export function maskPhone(normalized: string): string {
  const match = /^\+41(\d{2})\d{5}(\d{2})$/.exec(normalized);
  return match ? `+41 ${match[1]} ••• •• ${match[2]}` : HIDDEN;
}

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return HIDDEN;
  return `${email[0]}${HIDDEN}${email.slice(at)}`;
}
