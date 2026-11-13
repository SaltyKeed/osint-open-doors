import "server-only";
import type { Finding } from "@/server/domain/types";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";
import { PROVIDER_ID, toEmailFindings, toUsernameFindings } from "./mapper";

// Short usernames ("max", "jo") match thousands of strangers: not worth a request.
const MIN_USERNAME_LENGTH = 6;

async function check(value: string, signal: AbortSignal): Promise<unknown> {
  const url = `https://leakcheck.io/api/public?check=${encodeURIComponent(value)}`;
  const response = await providerFetch(PROVIDER_ID, url, signal, { headers: { Accept: "application/json" } });
  const raw: unknown = await response.json().catch(() => null);
  if (raw === null) throw new ProviderError(PROVIDER_ID, "invalid-response");
  return raw;
}

// Free public API of LeakCheck (D24): names and dates of the breaches, no password.
export const leakCheck: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["email", "username"],
  async search(query, signal) {
    const findings: Finding[] = [];
    if (query.email) findings.push(...toEmailFindings(await check(query.email, signal)));
    if (query.username && query.username.length >= MIN_USERNAME_LENGTH) {
      findings.push(...toUsernameFindings(await check(query.username, signal), query.username));
    }
    return findings;
  },
};
