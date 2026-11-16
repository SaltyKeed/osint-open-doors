import "server-only";
import { ownDomain } from "@/server/domain/email-domain";
import { providerFetch } from "../http";
import type { BreachProvider } from "../types";
import { PROVIDER_ID, toFindings } from "./mapper";

// ransomware.live (D29): victims claimed on the ransomware groups' leak sites. Only the
// domain of the email is sent (an organization, never a shared mailbox provider).
// Free API v2, personal and non-commercial use.
export const ransomwareLive: BreachProvider = {
  id: PROVIDER_ID,
  tier: "deep",
  supports: ["email"],
  async search(query, signal) {
    const domain = ownDomain(query.email);
    // The keyword is the name before the extension: "ecole-exemple" for ecole-exemple.ch.
    const keyword = domain?.split(".").slice(-2, -1)[0];
    if (!domain || !keyword || keyword.length < 3) return [];
    const url = `https://api.ransomware.live/v2/searchvictims/${encodeURIComponent(keyword)}`;
    const response = await providerFetch(PROVIDER_ID, url, signal, { headers: { Accept: "application/json" } }, [404]);
    if (response.status === 404) return [];
    return toFindings(await response.json().catch(() => null), domain);
  },
};
