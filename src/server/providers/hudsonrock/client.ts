import "server-only";
import { fetchJson } from "@/server/providers/http";

const BASE_URL = "https://cavalier.hudsonrock.com/api/json/v2/osint-tools";

/** Free OSINT endpoints, no API key. Raw JSON body, or null on 404. */
export function fetchByEmail(email: string, signal: AbortSignal): Promise<unknown | null> {
  return fetchJson("hudsonrock", `${BASE_URL}/search-by-email?email=${encodeURIComponent(email)}`, signal);
}

export function fetchByUsername(username: string, signal: AbortSignal): Promise<unknown | null> {
  return fetchJson("hudsonrock", `${BASE_URL}/search-by-username?username=${encodeURIComponent(username)}`, signal);
}
