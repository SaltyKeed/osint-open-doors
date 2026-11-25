import "server-only";
import { readOembed, readOgTags, type OgTags } from "../og-tags";
import type { WmnSite } from "./schema";

export type SiteResult = "found" | "missing" | "unknown";

/** Seconds given to one site before it is « unknown » (T7). */
const SITE_TIMEOUT_MS = 5000;

// Several sites answer only to a browser: a common browser name, nothing about the visitor.
export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

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

/** The verdict, and the og tags of the page when the account is found (T10). */
export interface SiteCheck {
  result: SiteResult;
  og: OgTags;
}

/**
 * Found only when the expected code AND text are both there; anything else, including an error or a
 * timeout, is « unknown », never « found ». Redirects are not followed: for some sites they are the proof.
 */
export async function checkSite(site: WmnSite, pseudo: string, signal: AbortSignal): Promise<SiteCheck> {
  try {
    const checked = site.uri_check.replace("{account}", account(site, pseudo));
    const response = await fetch(checked, {
      redirect: "manual",
      signal: AbortSignal.any([signal, AbortSignal.timeout(SITE_TIMEOUT_MS)]),
      headers: { "User-Agent": USER_AGENT, ...site.headers },
      cache: "no-store",
    });
    // The whole body on purpose, unlike the profile page source: the found and missing markers can be anywhere in it.
    const body = await response.text();
    // The tags are read only on a found account: a missing or unknown one gives nothing to keep.
    if (response.status === site.e_code && body.includes(site.e_string)) {
      // A JSON answer (an oEmbed API, as for TikTok) has no og tags but may give the displayed name.
      // An HTML page fails JSON.parse at once and falls back to its og tags.
      const oembed = readOembed(body, checked);
      const og = Object.keys(oembed).length > 0 ? oembed : readOgTags(body, checked);
      return { result: "found", og };
    }
    if (response.status === site.m_code && body.includes(site.m_string)) return { result: "missing", og: {} };
    return { result: "unknown", og: {} };
  } catch {
    return { result: "unknown", og: {} };
  }
}
