import "server-only";

const BASE_URL = "https://api.xposedornot.com/v1/breach-analytics";

/** Raw JSON body, or null when the API answers 404 (email not found). */
export async function fetchBreachAnalytics(email: string, signal: AbortSignal): Promise<unknown | null> {
  const response = await fetch(`${BASE_URL}?email=${encodeURIComponent(email)}`, {
    signal,
    cache: "no-store",
  });
  if (response.status === 404) return null;
  // Status code only: the URL and the body contain the visitor's email.
  if (!response.ok) throw new Error(`xposedornot: HTTP ${response.status}`);
  // A JSON SyntaxError quotes part of the body: replace it with a fixed message.
  return response.json().catch(() => {
    throw new Error("xposedornot: invalid response");
  });
}
