import "server-only";
import { ProviderError } from "./types";

// Shared HTTP call for every provider: no cache (personal data), errors reduced to
// technical identifiers. Statuses listed in `accept` (e.g. 404 = "not found") are
// returned to the caller instead of being treated as failures.
export async function providerFetch(
  providerId: string,
  url: string,
  signal: AbortSignal,
  init: RequestInit = {},
  accept: number[] = [],
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal, cache: "no-store" });
  } catch {
    throw new ProviderError(providerId, signal.aborted ? "timeout" : "invalid-response");
  }
  if (!response.ok && !accept.includes(response.status)) {
    throw new ProviderError(providerId, response.status);
  }
  return response;
}
