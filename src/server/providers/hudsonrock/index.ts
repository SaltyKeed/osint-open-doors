import "server-only";
import { ownDomain } from "@/server/domain/email-domain";
import type { Finding } from "@/server/domain/types";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";
import { PROVIDER_ID, toDomainFindings, toEmailFindings, toUsernameFindings } from "./mapper";

const BASE = "https://cavalier.hudsonrock.com/api/json/v2/osint-tools";

// Short usernames match thousands of strangers: not worth a request.
const MIN_USERNAME_LENGTH = 6;

async function lookup(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await providerFetch(PROVIDER_ID, `${BASE}/${path}`, signal, { headers: { Accept: "application/json" } }, [404]);
  if (response.status === 404) return null;
  const raw: unknown = await response.json().catch(() => undefined);
  if (raw === undefined) throw new ProviderError(PROVIDER_ID, "invalid-response");
  return raw;
}

// Free community API of Hudson Rock (D29): tells whether the email or the username was
// saved on a computer infected by an infostealer, and how many infected computers held an
// account of the email's organization (never for gmail.com and the like). No key.
export const hudsonRock: BreachProvider = {
  id: PROVIDER_ID,
  tier: "deep",
  supports: ["email", "username"],
  async search(query, signal) {
    const findings: Finding[] = [];
    if (query.email) {
      findings.push(...toEmailFindings(await lookup(`search-by-email?email=${encodeURIComponent(query.email)}`, signal)));
    }
    const domain = ownDomain(query.email);
    if (domain) {
      findings.push(...toDomainFindings(await lookup(`search-by-domain?domain=${encodeURIComponent(domain)}`, signal), domain));
    }
    if (query.username && query.username.length >= MIN_USERNAME_LENGTH) {
      const raw = await lookup(`search-by-username?username=${encodeURIComponent(query.username)}`, signal);
      findings.push(...toUsernameFindings(raw, query.username));
    }
    return findings;
  },
};
