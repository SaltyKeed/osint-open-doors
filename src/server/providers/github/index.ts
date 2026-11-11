import "server-only";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";
import { ownLogins, PROVIDER_ID, toFindings, toProfileFinding } from "./mapper";
import { commitSearchSchema, userSchema } from "./schema";

// Public commit search, then the public profile of the linked account.
// Works without a token (10 searches per minute); an optional GITHUB_TOKEN raises the limit.
export function createGitHubProvider(token: string | undefined): BreachProvider {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return {
    id: PROVIDER_ID,
    tier: "surface",
    supports: ["email"],
    async search(query, signal) {
      if (!query.email) return [];
      const q = encodeURIComponent(`author-email:${query.email}`);
      const response = await providerFetch(
        PROVIDER_ID,
        `https://api.github.com/search/commits?q=${q}&per_page=100`,
        signal,
        { headers },
      );
      const parsed = commitSearchSchema.safeParse(await response.json());
      if (!parsed.success) throw new ProviderError(PROVIDER_ID, "invalid-response");

      const findings = toFindings(parsed.data, query.email);
      const login = ownLogins(parsed.data, query.email)[0];
      if (!login) return findings;

      // The profile is a bonus: if it fails, the commit result is kept.
      try {
        const url = `https://api.github.com/users/${encodeURIComponent(login)}`;
        const profile = await providerFetch(PROVIDER_ID, url, signal, { headers });
        const user = userSchema.safeParse(await profile.json());
        if (user.success) findings.push(toProfileFinding(user.data));
      } catch {
        // keep the commit result
      }
      return findings;
    },
  };
}
