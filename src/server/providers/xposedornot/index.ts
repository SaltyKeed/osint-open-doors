import "server-only";
import { type BreachProvider, ProviderError } from "../types";
import { fetchBreachAnalytics } from "./client";
import { PROVIDER_ID, toFindings, toPasteFindings } from "./mapper";
import { breachAnalyticsSchema } from "./schema";

// Adapter: client (HTTP) -> schema (zod) -> mapper (whitelist).
export const xposedOrNot: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["email"],
  async search(query, signal) {
    if (!query.email) return [];
    const raw = await fetchBreachAnalytics(query.email, signal);
    const parsed = breachAnalyticsSchema.safeParse(raw);
    if (!parsed.success) throw new ProviderError(PROVIDER_ID, "invalid-response");
    return [...toFindings(parsed.data), ...toPasteFindings(parsed.data)];
  },
};
