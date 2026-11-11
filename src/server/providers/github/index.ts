import "server-only";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";
import { PROVIDER_ID, toFindings } from "./mapper";
import { commitSearchSchema } from "./schema";

// Public commit search. Works without a token (10 searches per minute);
// an optional GITHUB_TOKEN raises the limit to 30 per minute.
export function createGitHubProvider(token: string | undefined): BreachProvider {
  return {
    id: PROVIDER_ID,
    tier: "surface",
    supports: ["email"],
    async search(query, signal) {
      if (!query.email) return [];
      const q = encodeURIComponent(`author-email:${query.email}`);
      const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await providerFetch(
        PROVIDER_ID,
        `https://api.github.com/search/commits?q=${q}&per_page=100`,
        signal,
        { headers },
      );
      const parsed = commitSearchSchema.safeParse(await response.json());
      if (!parsed.success) throw new ProviderError(PROVIDER_ID, "invalid-response");
      return toFindings(parsed.data, query.email);
    },
  };
}
