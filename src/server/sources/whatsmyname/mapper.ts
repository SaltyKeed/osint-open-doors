import "server-only";
import type { WmnSite } from "./sites";

// Rules taken from the first prototype (sandbox-v1, providers/whatsmyname/mapper.ts).

// The most useful categories are checked first: the time is limited.
const PRIORITY = ["social", "coding", "tech", "video", "music", "images", "blog", "art", "gaming", "hobby", "news", "business"];

export function sortSites(sites: readonly WmnSite[]): WmnSite[] {
  const rank = (cat: string) => {
    const index = PRIORITY.indexOf(cat);
    return index === -1 ? PRIORITY.length : index;
  };
  return [...sites].sort((a, b) => rank(a.cat) - rank(b.cat));
}

export function prepareUsername(site: WmnSite, username: string): string {
  if (!site.strip_bad_char) return username;
  return [...site.strip_bad_char].reduce((u, char) => u.replaceAll(char, ""), username);
}

export function profileUrl(template: string, username: string): string {
  return template.replaceAll("{account}", encodeURIComponent(username));
}

/**
 * The rule of the list: the "exists" code and text, or the "missing" code and text.
 * Anything else is "unknown" and is never reported as found (CADRAGE.md, section 7).
 */
export function evaluate(site: WmnSite, status: number, body: string): "found" | "missing" | "unknown" {
  if (status === site.e_code && body.includes(site.e_string)) return "found";
  if (status === site.m_code && body.includes(site.m_string)) return "missing";
  return "unknown";
}
