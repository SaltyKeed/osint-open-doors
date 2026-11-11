import "server-only";
import { providerFetch } from "../http";
import { PROVIDER_ID } from "./mapper";

const BASE_URL = "https://search.ch/tel/api/";

// Returns the raw XML. Warning: search.ch copies the API key into its response,
// so the raw text must never be logged or returned.
export async function searchChQuery(
  apiKey: string,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<string> {
  const search = new URLSearchParams({ ...params, privat: "1", firma: "0", key: apiKey });
  const response = await providerFetch(PROVIDER_ID, `${BASE_URL}?${search}`, signal);
  return response.text();
}
