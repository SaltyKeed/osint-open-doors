import "server-only";

// Profile pages found by the search engine: they give a PROFIL and a PSEUDO to
// pivot on. The big networks are never read directly (CADRAGE.md, 6.4): only the
// address, title and excerpt given by the search engine are used.

interface Platform {
  platform: string;
  host: string;
  /** Path of a profile page; group 1 is the pseudo. */
  path: RegExp;
  reserved?: readonly string[];
}

const PLATFORMS: readonly Platform[] = [
  { platform: "Instagram", host: "instagram.com", path: /^\/([A-Za-z0-9._]{1,30})$/, reserved: ["p", "reel", "reels", "explore", "stories", "accounts", "tv", "direct"] },
  { platform: "TikTok", host: "tiktok.com", path: /^\/@([A-Za-z0-9._]{2,24})$/ },
  { platform: "X", host: "x.com", path: /^\/([A-Za-z0-9_]{1,15})$/, reserved: ["home", "search", "explore", "i", "settings", "hashtag", "intent", "share", "login"] },
  { platform: "X", host: "twitter.com", path: /^\/([A-Za-z0-9_]{1,15})$/, reserved: ["home", "search", "explore", "i", "settings", "hashtag", "intent", "share", "login"] },
  { platform: "Facebook", host: "facebook.com", path: /^\/([A-Za-z0-9.]{5,50})$/, reserved: ["groups", "pages", "events", "watch", "marketplace", "photo", "share", "people", "public", "login"] },
  { platform: "LinkedIn", host: "linkedin.com", path: /^\/in\/([A-Za-z0-9\-_%]{3,100})$/ },
  { platform: "GitHub", host: "github.com", path: /^\/([A-Za-z0-9-]{1,39})$/, reserved: ["features", "topics", "orgs", "about", "pricing", "search", "login", "marketplace", "explore", "settings", "sponsors", "enterprise"] },
  { platform: "YouTube", host: "youtube.com", path: /^\/@([A-Za-z0-9._-]{3,30})$/ },
  { platform: "Twitch", host: "twitch.tv", path: /^\/([A-Za-z0-9_]{4,25})$/, reserved: ["directory", "videos", "settings", "downloads"] },
  { platform: "Reddit", host: "reddit.com", path: /^\/(?:user|u)\/([A-Za-z0-9_-]{3,20})$/ },
  { platform: "Pinterest", host: "pinterest.com", path: /^\/([A-Za-z0-9_]{3,30})$/, reserved: ["pin", "ideas", "search", "today"] },
  { platform: "SoundCloud", host: "soundcloud.com", path: /^\/([a-z0-9_-]{3,25})$/, reserved: ["discover", "search", "stream", "upload", "charts"] },
  { platform: "Threads", host: "threads.net", path: /^\/@([A-Za-z0-9._]{1,30})$/ },
  { platform: "Medium", host: "medium.com", path: /^\/@([A-Za-z0-9._-]{1,30})$/ },
];

export interface FoundProfile {
  platform: string;
  /** Normalized address: https, host without www, no trailing slash. */
  url: string;
  pseudo: string;
}

export function profileFromUrl(raw: string): FoundProfile | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");
  for (const p of PLATFORMS) {
    if (hostname !== p.host && !hostname.endsWith(`.${p.host}`)) continue;
    const pseudo = p.path.exec(path)?.[1];
    if (!pseudo || p.reserved?.includes(pseudo.toLowerCase())) return null;
    return { platform: p.platform, url: `https://${p.host}${path}`, pseudo };
  }
  return null;
}
