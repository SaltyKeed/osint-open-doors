import "server-only";
import { normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";

// Domain of an email when it says something about the person: a personal domain
// (lea-martin.ch) or an organisation (employer, school). Shared mailbox providers
// are ignored: millions of strangers use them. List taken from the first prototype.
const SHARED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.fr", "hotmail.ch", "outlook.com",
  "outlook.fr", "live.com", "live.fr", "msn.com", "yahoo.com", "yahoo.fr", "icloud.com",
  "me.com", "mac.com", "proton.me", "protonmail.com", "protonmail.ch", "gmx.ch", "gmx.net",
  "gmx.de", "gmx.fr", "bluewin.ch", "sunrise.ch", "hispeed.ch", "netplus.ch", "romandie.com",
  "orange.fr", "free.fr", "laposte.net", "aol.com", "yandex.com", "mail.com", "tutanota.com",
  "example.com", "example.org", "example.net",
]);

export function ownDomain(email: string): string | undefined {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain || !domain.includes(".") || SHARED_DOMAINS.has(domain)) return undefined;
  return domain;
}

export function toEmailDomainRecord(email: Identifier): SourceRecord | null {
  const domain = ownDomain(email.value);
  const identifier = domain ? normalizeIdentifier("DOMAINE", domain) : null;
  if (!domain || !identifier) return null;
  return {
    origin: "Domaine de l'email",
    evidence: null,
    values: [{ field: "F3", value: domain }],
    identifiers: [{ identifier: email }, { identifier }],
  };
}

// Local computation, no network call (SOURCES.md, section 2).
export const emailDomain: Source = {
  id: "emaildomain",
  label: "Domaine de l'email",
  accepts: ["EMAIL"],
  requiredEnv: [],
  async run(email) {
    const record = toEmailDomainRecord(email);
    return found(record ? [record] : []);
  },
};
