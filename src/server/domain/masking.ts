// Masks personal values before they are displayed (CLAUDE.md invariant).

const MASK = "•";

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return MASK.repeat(3);

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length === 1) return `${local}@${domain}`;
  if (local.length === 2) return `${local[0]}${MASK}@${domain}`;

  const middle = MASK.repeat(local.length - 2);
  return `${local[0]}${middle}${local[local.length - 1]}@${domain}`;
}
