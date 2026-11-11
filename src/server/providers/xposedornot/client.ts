import "server-only";
import { ProviderError } from "../types";
import { PROVIDER_ID } from "./mapper";

const BASE_URL = "https://api.xposedornot.com/v1/breach-analytics";

// HTTP call only: returns the raw JSON, parsing happens in schema.ts.
export async function fetchBreachAnalytics(email: string, signal: AbortSignal): Promise<unknown> {
  const url = `${BASE_URL}?email=${encodeURIComponent(email)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      // Personal data: never cached by Next.js.
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ProviderError(PROVIDER_ID, signal.aborted ? "timeout" : "invalid-response");
  }
  if (!response.ok) throw new ProviderError(PROVIDER_ID, response.status);
  return response.json();
}
