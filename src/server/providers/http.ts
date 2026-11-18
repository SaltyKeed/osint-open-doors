import "server-only";
import { SourceQuotaError } from "@/server/domain/source";

/**
 * GET a JSON API for a source. Returns the body, or null on 404 (nothing found).
 * Errors carry fixed messages: the URL and the body may contain the visitor's input.
 */
export async function fetchJson(
  sourceId: string,
  url: string,
  signal: AbortSignal,
  headers: Record<string, string> = {},
): Promise<unknown | null> {
  const response = await fetch(url, { signal, headers, cache: "no-store" });
  if (response.status === 404) return null;
  // 429, or 403 with no request left (the GitHub way to say the quota is reached).
  const quota = response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
  if (quota) throw new SourceQuotaError(sourceId);
  if (!response.ok) throw new Error(`${sourceId}: HTTP ${response.status}`);
  // A JSON SyntaxError quotes part of the body: replace it with a fixed message.
  return response.json().catch(() => {
    throw new Error(`${sourceId}: invalid response`);
  });
}
