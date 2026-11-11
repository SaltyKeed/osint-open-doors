import "server-only";
import type { Finding, QueryKind, SearchQuery } from "@/server/domain/types";

// "surface": legal public sources. "deep": paid breach services (D10, D12).
export type ProviderTier = "surface" | "deep";

// The port: every external source implements this interface.
// The rest of the app only knows this contract, never a provider's raw format.
export interface BreachProvider {
  id: string;
  tier: ProviderTier;
  supports: readonly QueryKind[];
  search(query: SearchQuery, signal: AbortSignal): Promise<Finding[]>;
}

// Error with technical identifiers only: never a visitor input or a response body.
export class ProviderError extends Error {
  constructor(
    readonly providerId: string,
    readonly status: number | "timeout" | "invalid-response" | "missing-key",
  ) {
    super(`Provider ${providerId} failed (${status})`);
    this.name = "ProviderError";
  }
}
