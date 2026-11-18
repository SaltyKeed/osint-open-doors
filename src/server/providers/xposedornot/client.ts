import "server-only";
import { fetchJson } from "@/server/providers/http";

const BASE_URL = "https://api.xposedornot.com/v1/breach-analytics";

/** Raw JSON body, or null when the API answers 404 (email not found). */
export function fetchBreachAnalytics(email: string, signal: AbortSignal): Promise<unknown | null> {
  return fetchJson("xposedornot", `${BASE_URL}?email=${encodeURIComponent(email)}`, signal);
}
