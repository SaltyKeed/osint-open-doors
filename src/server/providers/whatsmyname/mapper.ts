import "server-only";
import type { WmnSite } from "./schema";

export const PROVIDER_ID = "whatsmyname";

// Categories not shown at a school open day.
const EXCLUDED_CATEGORIES = new Set(["xx NSFW xx", "dating"]);

// Most useful categories are checked first (the time is limited).
const PRIORITY = ["social", "coding", "tech", "video", "music", "images", "blog", "art", "gaming", "hobby", "news", "business"];

export function selectSites(sites: WmnSite[]): WmnSite[] {
  const rank = (cat: string) => {
    const index = PRIORITY.indexOf(cat);
    return index === -1 ? PRIORITY.length : index;
  };
  return sites
    .filter((s) => !s.post_body && s.valid !== false && !EXCLUDED_CATEGORIES.has(s.cat))
    .sort((a, b) => rank(a.cat) - rank(b.cat));
}

export function prepareUsername(site: WmnSite, username: string): string {
  if (!site.strip_bad_char) return username;
  return [...site.strip_bad_char].reduce((u, char) => u.replaceAll(char, ""), username);
}

export function profileUrl(template: string, username: string): string {
  return template.replaceAll("{account}", encodeURIComponent(username));
}

// The dataset rule: the "exists" code and text, or the "missing" code and text.
// Anything else is uncertain and is not reported.
export function evaluate(site: WmnSite, status: number, body: string): "found" | "missing" | "unknown" {
  if (status === site.e_code && body.includes(site.e_string)) return "found";
  if (status === site.m_code && body.includes(site.m_string)) return "missing";
  return "unknown";
}
