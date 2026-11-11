// Usernames ("handles") are the best pivot: people often reuse the same one.

const USABLE = /^[A-Za-z0-9._-]{3,40}$/;

export function isUsableHandle(handle: string): boolean {
  return USABLE.test(handle);
}

// Paths that look like a profile but are site pages.
const RESERVED = new Set([
  "about", "explore", "features", "home", "login", "search", "settings", "signup", "topics",
  "p", "reel", "reels", "stories", "watch", "hashtag", "i", "intent", "share", "status",
  "orgs", "marketplace", "pricing", "enterprise", "sponsors", "pulls", "issues",
]);

type Pattern = { host: RegExp; read: (segments: string[]) => string | undefined };

const PATTERNS: Pattern[] = [
  { host: /(^|\.)github\.com$/, read: (s) => s[0] },
  { host: /(^|\.)instagram\.com$/, read: (s) => s[0] },
  { host: /(^|\.)(x|twitter)\.com$/, read: (s) => s[0] },
  { host: /(^|\.)(tiktok|youtube)\.com$/, read: (s) => (s[0]?.startsWith("@") ? s[0].slice(1) : undefined) },
  { host: /(^|\.)reddit\.com$/, read: (s) => (s[0] === "user" || s[0] === "u" ? s[1] : undefined) },
  { host: /(^|\.)linkedin\.com$/, read: (s) => (s[0] === "in" ? s[1] : undefined) },
  { host: /(^|\.)facebook\.com$/, read: (s) => (s[0] && !s[0].includes(".php") ? s[0] : undefined) },
  { host: /(^|\.)twitch\.tv$/, read: (s) => s[0] },
  { host: /(^|\.)medium\.com$/, read: (s) => (s[0]?.startsWith("@") ? s[0].slice(1) : undefined) },
];

export function handleFromProfileUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  for (const pattern of PATTERNS) {
    if (!pattern.host.test(host)) continue;
    const handle = pattern.read(segments);
    if (!handle || RESERVED.has(handle.toLowerCase()) || !isUsableHandle(handle)) return null;
    return handle;
  }
  return null;
}
