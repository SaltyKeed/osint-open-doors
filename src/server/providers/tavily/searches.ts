import "server-only";
import { phoneSearchVariants } from "@/server/domain/phone";
import type { QueryKind, SearchQuery } from "@/server/domain/types";
import type { TavilyOptions } from "./client";

export type PlannedSearch = { searchedOn: QueryKind; text: string; options: TavilyOptions };

// Sites grouped by theme, for targeted searches on the full name.
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
// Sites where people report and comment phone numbers (spam, callers) and directories.
const PHONE_SITES = [
  "tellows.ch", "tellows.de", "tellows.fr", "tellows.at", "local.ch", "search.ch",
  "telguarder.com", "werruft.info", "wemgehoert.de", "sync.me", "callfilter.app",
];
const SPORT_AND_CLUBS = [
  "datasport.com", "mychip.ch", "swiss-athletics.ch", "swiss-ski.ch", "swimrankings.net",
  "football.ch", "swissvolley.ch", "swissbasketball.ch", "swiss-unihockey.ch", "sihf.ch",
  "fftt.com", "chess-results.com", "speedhive.mylaps.com",
];

// Every search for the visitor. The name is always searched as a whole ("First Last").
export function plannedSearches(query: SearchQuery): PlannedSearch[] {
  const searches: PlannedSearch[] = [];

  if (query.email) {
    searches.push({ searchedOn: "email", text: `"${query.email}"`, options: { maxResults: 20, depth: "basic" } });
  }

  if (query.phone) {
    const variants = phoneSearchVariants(query.phone).map((v) => `"${v}"`).join(" OR ");
    searches.push(
      { searchedOn: "phone", text: variants, options: { maxResults: 20, depth: "basic" } },
      { searchedOn: "phone", text: variants, options: { maxResults: 20, depth: "basic", includeDomains: PHONE_SITES } },
    );
  }

  if (query.firstName && query.lastName) {
    const name = `"${query.firstName} ${query.lastName}"`;
    searches.push(
      { searchedOn: "name", text: name, options: { maxResults: 20, depth: "advanced" } },
      { searchedOn: "name", text: name, options: { maxResults: 20, depth: "basic", includeDomains: SOCIAL } },
      { searchedOn: "name", text: name, options: { maxResults: 20, depth: "basic", includeDomains: SWISS_PRESS } },
      { searchedOn: "name", text: name, options: { maxResults: 20, depth: "basic", includeDomains: SPORT_AND_CLUBS } },
      { searchedOn: "name", text: `${name} CV OR pdf OR curriculum OR résumé OR membres OR liste`, options: { maxResults: 20, depth: "basic" } },
      // Initial forms often used in results lists and press (D20).
      {
        searchedOn: "name",
        text: `"${query.firstName.charAt(0)}. ${query.lastName}" OR "${query.lastName} ${query.firstName.charAt(0)}."`,
        options: { maxResults: 20, depth: "basic" },
      },
    );
    if (query.city) {
      searches.push({ searchedOn: "name", text: `${name} "${query.city}"`, options: { maxResults: 20, depth: "basic" } });
    }
  }

  return searches;
}
