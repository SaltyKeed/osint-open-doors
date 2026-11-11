import "server-only";
import { providerFetch } from "../http";
import { PROVIDER_ID } from "./mapper";

const BASE_URL = "https://api.xposedornot.com/v1/breach-analytics";

// HTTP call only: returns the raw JSON, parsing happens in schema.ts.
export async function fetchBreachAnalytics(email: string, signal: AbortSignal): Promise<unknown> {
  const url = `${BASE_URL}?email=${encodeURIComponent(email)}`;
  const response = await providerFetch(PROVIDER_ID, url, signal, {
    headers: { Accept: "application/json" },
  });
  return response.json();
}
