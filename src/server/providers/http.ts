import "server-only";
import { SourceQuotaError } from "@/server/domain/source";

/** Quota reached: 429 everywhere, 432 and 433 at Tavily (plan and pay-as-you-go limits). */
const QUOTA_STATUSES: ReadonlySet<number> = new Set([429, 432, 433]);

/**
 * Call a JSON API for a source: GET, or POST when a body is given. Returns the body, or null on 404
 * (nothing found). Errors carry fixed messages: the URL and the body may contain the visitor's input.
 */
export async function fetchJson(
  sourceId: string,
  url: string,
  signal: AbortSignal,
  headers: Record<string, string> = {},
  body?: unknown,
): Promise<unknown | null> {
  const init: RequestInit =
    body === undefined
      ? { signal, headers, cache: "no-store" }
      : {
          method: "POST",
          signal,
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        };
  const response = await fetch(url, init);
  if (response.status === 404) return null;
  // 429, or 403 with no request left (the GitHub way to say the quota is reached).
  const quota =
    QUOTA_STATUSES.has(response.status) ||
    (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
  if (quota) throw new SourceQuotaError(sourceId);
  if (!response.ok) throw new Error(`${sourceId}: HTTP ${response.status}`);
  // A JSON SyntaxError quotes part of the body: replace it with a fixed message.
  return response.json().catch(() => {
    throw new Error(`${sourceId}: invalid response`);
  });
}
