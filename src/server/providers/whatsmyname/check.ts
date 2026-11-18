import "server-only";
import type { WmnSite } from "./schema";

export type SiteResult = "found" | "missing" | "unknown";

/** Seconds given to one site before it is « unknown » (T7). */
const SITE_TIMEOUT_MS = 5000;

// Several sites answer only to a browser: a common browser name, nothing about the visitor.
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/** Adult sites are forbidden at an open day; protected sites and POST sites give unreliable answers (T7). */
export function usableSites(sites: readonly WmnSite[]): WmnSite[] {
  return sites.filter((s) => s.cat !== "xx NSFW xx" && !s.protection?.length && !s.post_body && s.valid !== false);
}

function account(site: WmnSite, pseudo: string): string {
  const stripped = site.strip_bad_char ? pseudo.split(site.strip_bad_char).join("") : pseudo;
  return encodeURIComponent(stripped);
}

/** Address of the profile shown to the visitor. */
export function profileUrl(site: WmnSite, pseudo: string): string {
  return (site.uri_pretty ?? site.uri_check).replace("{account}", account(site, pseudo));
}

/**
 * Found only when the expected code AND text are both there; anything else, including an error or a
 * timeout, is « unknown », never « found ». Redirects are not followed: for some sites they are the proof.
 */
export async function checkSite(site: WmnSite, pseudo: string, signal: AbortSignal): Promise<SiteResult> {
  try {
    const response = await fetch(site.uri_check.replace("{account}", account(site, pseudo)), {
      redirect: "manual",
      signal: AbortSignal.any([signal, AbortSignal.timeout(SITE_TIMEOUT_MS)]),
      headers: { "User-Agent": USER_AGENT, ...site.headers },
      cache: "no-store",
    });
    const body = await response.text();
    if (response.status === site.e_code && body.includes(site.e_string)) return "found";
    if (response.status === site.m_code && body.includes(site.m_string)) return "missing";
    return "unknown";
  } catch {
    return "unknown";
  }
}
