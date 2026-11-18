import "server-only";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { Identifier } from "@/server/domain/identifier";

// The exact searches of SOURCES.md, section 4. The site lists come from the first
// prototype (sandbox-v1, providers/tavily/searches.ts).

export interface PlannedQuery {
  query: string;
  includeDomains?: string[];
  maxResults: number;
}

const SOCIAL = [
  "linkedin.com", "facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com",
  "youtube.com", "github.com", "strava.com", "pinterest.com", "soundcloud.com", "twitch.tv",
  "reddit.com", "medium.com", "vimeo.com", "flickr.com",
];
const SWISS_PRESS = [
  "arcinfo.ch", "rtn.ch", "canalalpha.ch", "rts.ch", "lematin.ch", "24heures.ch", "tdg.ch",
  "lacote.ch", "lenouvelliste.ch", "lequotidienjurassien.ch", "laliberte.ch", "20min.ch",
  "watson.ch", "blick.ch", "srf.ch", "nzz.ch", "tagesanzeiger.ch", "bernerzeitung.ch",
];
const SPORT_AND_CLUBS = [
  "datasport.com", "mychip.ch", "swiss-athletics.ch", "swiss-ski.ch", "swimrankings.net",
  "football.ch", "swissvolley.ch", "swissbasketball.ch", "swiss-unihockey.ch", "sihf.ch",
  "fftt.com", "chess-results.com", "speedhive.mylaps.com",
];
const PROFILE_SITES = [
  "instagram.com", "tiktok.com", "x.com", "twitter.com", "threads.net", "youtube.com", "twitch.tv",
  "pinterest.com", "snapchat.com", "soundcloud.com", "reddit.com", "github.com",
];

/** "+41791234567", "0791234567", "079 123 45 67", "+41 79 123 45 67". */
export function phoneFormats(e164: string): string[] {
  const phone = parsePhoneNumberFromString(e164);
  if (!phone) return [e164];
  const national = phone.formatNational();
  return [...new Set([phone.number, national.replace(/\s/g, ""), national, phone.formatInternational()])];
}

const quote = (s: string) => `"${s}"`;

export function planQueries(identifier: Identifier): PlannedQuery[] {
  const exact = quote(identifier.value);
  switch (identifier.type) {
    case "EMAIL":
      return [{ query: exact, maxResults: 10 }];
    case "TEL":
      return [{ query: phoneFormats(identifier.value).map(quote).join(" OR "), maxResults: 10 }];
    case "PSEUDO":
      return [
        { query: exact, maxResults: 10 },
        { query: exact, maxResults: 10, includeDomains: PROFILE_SITES },
      ];
    case "NOM":
      return [
        { query: exact, maxResults: 10 },
        { query: exact, maxResults: 10, includeDomains: SOCIAL },
        { query: exact, maxResults: 10, includeDomains: SWISS_PRESS },
        { query: exact, maxResults: 10, includeDomains: SPORT_AND_CLUBS },
      ];
    default:
      return [];
  }
}
