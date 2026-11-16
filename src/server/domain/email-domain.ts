// Domain of an email, when it says something about the visitor: a personal domain
// (jean-dupont.ch) or an organization (employer, school). Shared mailbox providers
// (gmail.com, bluewin.ch...) are ignored: millions of strangers use them.

const SHARED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.fr", "hotmail.ch", "outlook.com",
  "outlook.fr", "live.com", "live.fr", "msn.com", "yahoo.com", "yahoo.fr", "icloud.com",
  "me.com", "mac.com", "proton.me", "protonmail.com", "protonmail.ch", "gmx.ch", "gmx.net",
  "gmx.de", "gmx.fr", "bluewin.ch", "sunrise.ch", "hispeed.ch", "netplus.ch", "romandie.com",
  "orange.fr", "free.fr", "laposte.net", "aol.com", "yandex.com", "mail.com", "tutanota.com",
  "example.com", "example.org", "example.net",
]);

export function ownDomain(email: string | undefined): string | undefined {
  const domain = email?.split("@")[1]?.trim().toLowerCase();
  if (!domain || !domain.includes(".") || SHARED_DOMAINS.has(domain)) return undefined;
  return domain;
}
