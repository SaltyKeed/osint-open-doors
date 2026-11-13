import "server-only";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

// Public profile APIs that answer with a username (D24). Unlike WhatsMyName (does the
// page exist?), they give facts: creation year, country, activity. Only those facts are
// kept: never a display name, bio, city or photo, because the same username can belong
// to someone else.

export type ProfileFacts = { url: string; details: string[] };

export type ProfileSite = {
  site: string;
  category: string;
  apiUrl: (username: string) => string;
  format: "json" | "xml";
  // Returns null when the account does not exist.
  read: (raw: unknown, username: string) => ProfileFacts | null;
};

// Year of a date given as ISO text, English text ("May 12, 2020") or a timestamp.
export function yearOf(value: string | number | null | undefined, unit: "s" | "ms" = "ms"): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const date = typeof value === "number" ? new Date(unit === "s" ? value * 1000 : value) : new Date(value);
  const year = date.getUTCFullYear();
  return Number.isFinite(year) && year > 1990 && year <= new Date().getUTCFullYear() ? String(year) : undefined;
}

const created = (year: string | undefined) => (year ? [`Compte créé en ${year}`] : []);
const country = (code: string | null | undefined) =>
  code && /^[A-Z]{2}$/.test(code) && code !== "XX" ? [`Pays indiqué : ${code}`] : [];
const amount = (n: number | undefined, singular: string, plural: string) =>
  n !== undefined && n > 0 ? [`${n.toLocaleString("fr-CH")} ${n > 1 ? plural : singular}`] : [];

const chessSchema = z.object({
  url: z.string(),
  joined: z.number().optional(),
  last_online: z.number().optional(),
  country: z.string().optional(),
});

const lichessSchema = z.object({
  url: z.string(),
  createdAt: z.number().optional(),
  disabled: z.boolean().optional(),
  closed: z.boolean().optional(),
  count: z.object({ all: z.number() }).optional(),
  profile: z.object({ flag: z.string().optional() }).optional(),
});

const blueskySchema = z.object({
  handle: z.string(),
  createdAt: z.string().optional(),
  postsCount: z.number().optional(),
  followersCount: z.number().optional(),
});

const mojangSchema = z.object({ id: z.string(), name: z.string() });

const codebergSchema = z.object({ html_url: z.string(), created: z.string().optional() });

const hackerNewsSchema = z.object({ id: z.string(), created: z.number(), karma: z.number().optional() }).nullable();

const speedrunSchema = z.object({
  data: z.array(
    z.object({
      weblink: z.string(),
      signup: z.string().nullish(),
      location: z.object({ country: z.object({ code: z.string() }) }).nullish(),
      twitch: z.object({ uri: z.string() }).nullish(),
      youtube: z.object({ uri: z.string() }).nullish(),
    }),
  ),
});

const devtoSchema = z.object({ username: z.string(), joined_at: z.string().optional(), github_username: z.string().nullish() });

const steamSchema = z.object({
  profile: z
    .object({
      steamID64: z.union([z.string(), z.number()]),
      memberSince: z.string().optional(),
      privacyState: z.string().optional(),
    })
    .optional(),
});

function parse<T>(schema: z.ZodType<T>, raw: unknown): T | null {
  const result = schema.safeParse(raw);
  return result.success ? result.data : null;
}

export const PROFILE_SITES: ProfileSite[] = [
  {
    site: "Chess.com",
    category: "gaming",
    apiUrl: (u) => `https://api.chess.com/pub/player/${encodeURIComponent(u.toLowerCase())}`,
    format: "json",
    read: (raw) => {
      const p = parse(chessSchema, raw);
      if (!p) return null;
      const lastOnline = yearOf(p.last_online, "s");
      return {
        url: p.url,
        details: [
          ...created(yearOf(p.joined, "s")),
          ...country(p.country?.split("/").pop()),
          ...(lastOnline ? [`Dernière connexion en ${lastOnline}`] : []),
        ],
      };
    },
  },
  {
    site: "Lichess",
    category: "gaming",
    apiUrl: (u) => `https://lichess.org/api/user/${encodeURIComponent(u)}`,
    format: "json",
    read: (raw) => {
      const p = parse(lichessSchema, raw);
      if (!p || p.disabled || p.closed) return null;
      return {
        url: p.url,
        details: [...created(yearOf(p.createdAt)), ...country(p.profile?.flag), ...amount(p.count?.all, "partie jouée", "parties jouées")],
      };
    },
  },
  {
    site: "Steam",
    category: "gaming",
    apiUrl: (u) => `https://steamcommunity.com/id/${encodeURIComponent(u)}?xml=1`,
    format: "xml",
    read: (raw, u) => {
      const p = parse(steamSchema, raw)?.profile;
      if (!p) return null;
      return {
        url: `https://steamcommunity.com/id/${encodeURIComponent(u)}`,
        details: [
          ...created(yearOf(p.memberSince)),
          ...(p.privacyState === "public" ? ["Profil public"] : []),
        ],
      };
    },
  },
  {
    site: "Minecraft",
    category: "gaming",
    apiUrl: (u) => `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(u)}`,
    format: "json",
    read: (raw) => {
      const p = parse(mojangSchema, raw);
      if (!p) return null;
      return { url: `https://namemc.com/profile/${p.id}`, details: ["Compte Minecraft Java avec ce pseudo"] };
    },
  },
  {
    site: "Speedrun.com",
    category: "gaming",
    apiUrl: (u) => `https://www.speedrun.com/api/v1/users?lookup=${encodeURIComponent(u)}`,
    format: "json",
    read: (raw) => {
      const p = parse(speedrunSchema, raw)?.data[0];
      if (!p) return null;
      const linked = [p.twitch && "Twitch", p.youtube && "YouTube"].filter(Boolean);
      return {
        url: p.weblink,
        details: [
          ...created(yearOf(p.signup)),
          ...country(p.location?.country.code.slice(0, 2).toUpperCase()),
          ...(linked.length > 0 ? [`Relié à : ${linked.join(", ")}`] : []),
        ],
      };
    },
  },
  {
    site: "Bluesky",
    category: "social",
    apiUrl: (u) => `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(`${u.toLowerCase()}.bsky.social`)}`,
    format: "json",
    read: (raw) => {
      const p = parse(blueskySchema, raw);
      if (!p) return null;
      return {
        url: `https://bsky.app/profile/${p.handle}`,
        details: [...created(yearOf(p.createdAt)), ...amount(p.postsCount, "publication", "publications"), ...amount(p.followersCount, "abonné", "abonnés")],
      };
    },
  },
  {
    site: "Codeberg",
    category: "coding",
    apiUrl: (u) => `https://codeberg.org/api/v1/users/${encodeURIComponent(u)}`,
    format: "json",
    read: (raw) => {
      const p = parse(codebergSchema, raw);
      if (!p) return null;
      return { url: p.html_url, details: created(yearOf(p.created)) };
    },
  },
  {
    site: "Hacker News",
    category: "coding",
    apiUrl: (u) => `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(u)}.json`,
    format: "json",
    read: (raw) => {
      const p = parse(hackerNewsSchema, raw);
      if (!p) return null;
      return {
        url: `https://news.ycombinator.com/user?id=${encodeURIComponent(p.id)}`,
        details: [...created(yearOf(p.created, "s")), ...amount(p.karma, "point de karma", "points de karma")],
      };
    },
  },
  {
    site: "DEV Community",
    category: "coding",
    apiUrl: (u) => `https://dev.to/api/users/by_username?url=${encodeURIComponent(u)}`,
    format: "json",
    read: (raw) => {
      const p = parse(devtoSchema, raw);
      if (!p) return null;
      return {
        url: `https://dev.to/${encodeURIComponent(p.username)}`,
        details: [...created(yearOf(p.joined_at)), ...(p.github_username ? ["Relié à : GitHub"] : [])],
      };
    },
  },
];

const xml = new XMLParser({ ignoreAttributes: true, parseTagValue: false });

export function parseBody(text: string, format: ProfileSite["format"]): unknown {
  try {
    return format === "xml" ? xml.parse(text) : JSON.parse(text);
  } catch {
    return null;
  }
}
