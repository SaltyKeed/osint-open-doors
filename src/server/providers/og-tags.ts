import "server-only";
import { isIP } from "node:net";
import { z } from "zod";

/** What a profile page says about itself in its link-preview tags (T10). */
export interface OgTags {
  /** Page title, usually the displayed name (see `displayName`). */
  title?: string;
  /** Photo address, https only. */
  image?: string;
  /** Bio. */
  description?: string;
}

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 500;
const MAX_IMAGE_LENGTH = 2048;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  ccedil: "ç",
  Ccedil: "Ç",
  ntilde: "ñ",
  szlig: "ß",
};
// Accented Latin-1 letters: name = base letter + accent name, lowercase and uppercase.
for (const [accent, letters] of Object.entries({
  acute: "aeiouy",
  grave: "aeiou",
  circ: "aeiou",
  uml: "aeiouy",
})) {
  for (const letter of letters) {
    const lower = letter.normalize("NFD");
    const mark = { acute: "́", grave: "̀", circ: "̂", uml: "̈" }[accent]!;
    NAMED_ENTITIES[`${letter}${accent}`] = (lower + mark).normalize("NFC");
    NAMED_ENTITIES[`${letter.toUpperCase()}${accent}`] = (lower.toUpperCase() + mark).normalize("NFC");
  }
}

/** One pass over the text, so that "&amp;lt;" becomes "&lt;" and not "<". */
function decodeEntities(text: string): string {
  return text.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]+));/g, (whole, dec?: string, hex?: string, name?: string) => {
    if (name) return NAMED_ENTITIES[name] ?? whole;
    const code = dec ? Number.parseInt(dec, 10) : Number.parseInt(hex!, 16);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

function clean(raw: string, maxLength: number): string | undefined {
  const text = decodeEntities(raw).replace(/\s+/g, " ").trim().slice(0, maxLength);
  return text === "" ? undefined : text;
}

/** True for `localhost`, its subdomains and any IP address written as a host (`127.0.0.1`, `[::1]`). */
function isLocalOrIpHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host.endsWith(".localhost") || isIP(host) !== 0;
}

/**
 * Kept only if it ends as an https address on a named host. A protocol-relative or relative address is
 * resolved against the page address; without one it is dropped. Never `javascript:`, `data:`, an IP or localhost.
 */
function cleanImage(raw: string, baseUrl: string | undefined): string | undefined {
  const text = clean(raw, MAX_IMAGE_LENGTH);
  if (!text) return undefined;
  try {
    const url = baseUrl ? new URL(text, baseUrl) : new URL(text);
    return url.protocol === "https:" && !isLocalOrIpHost(url.hostname) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** The shape every caller can rely on: external data goes through a schema (CLAUDE.md). */
const ogTagsSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
  image: z
    .url({ protocol: /^https$/ })
    .max(MAX_IMAGE_LENGTH)
    .optional(),
  description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH).optional(),
});

function attributes(tag: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const name = match[1]!.toLowerCase();
    if (!found.has(name)) found.set(name, match[2] ?? match[3] ?? "");
  }
  return found;
}

/**
 * Reads og:title, og:image and og:description. No HTML parser: only the meta tags are looked at.
 * `baseUrl` is the address of the page, to resolve a relative image address.
 */
export function readOgTags(html: string, baseUrl?: string): OgTags {
  const raw = new Map<string, string>();
  // A ">" is allowed inside a quoted value.
  for (const [tag] of html.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const attrs = attributes(tag);
    const key = (attrs.get("property") ?? attrs.get("name"))?.trim().toLowerCase();
    const content = attrs.get("content");
    if (key?.startsWith("og:") && content !== undefined && !raw.has(key)) raw.set(key, content);
  }
  const parsed = ogTagsSchema.safeParse({
    title: clean(raw.get("og:title") ?? "", MAX_TITLE_LENGTH),
    image: cleanImage(raw.get("og:image") ?? "", baseUrl),
    description: clean(raw.get("og:description") ?? "", MAX_DESCRIPTION_LENGTH),
  });
  if (!parsed.success) return {};
  const { title, image, description } = parsed.data;
  return { ...(title && { title }), ...(image && { image }), ...(description && { description }) };
}

/** The fields we read in an oEmbed answer (oembed.com): the others are ignored. */
const oembedSchema = z.object({ author_name: z.string(), thumbnail_url: z.string().optional() });

/**
 * Some sites are checked through their oEmbed API (TikTok): the answer is JSON, without og tags, but it
 * gives the displayed name. Read as the og tags are, with the same limits (T10).
 */
export function readOembed(body: string, baseUrl?: string): OgTags {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return {};
  }
  const oembed = oembedSchema.safeParse(json);
  if (!oembed.success) return {};
  const parsed = ogTagsSchema.safeParse({
    title: clean(oembed.data.author_name, MAX_TITLE_LENGTH),
    image: cleanImage(oembed.data.thumbnail_url ?? "", baseUrl),
  });
  if (!parsed.success) return {};
  const { title, image } = parsed.data;
  return { ...(title && { title }), ...(image && { image }) };
}

const NAME_SEPARATORS = [" (", " | ", " • ", " · ", " - ", " — "];

/**
 * The name part of a page title: "Léa Martin (@lmartin_06) • Instagram" gives "Léa Martin". The whole
 * title is returned when nothing is left before the first separator.
 */
export function displayName(title: string): string {
  const cuts = NAME_SEPARATORS.map((sep) => title.indexOf(sep)).filter((i) => i >= 0);
  const name = (cuts.length > 0 ? title.slice(0, Math.min(...cuts)) : title).trim();
  return name === "" ? title : name;
}

/**
 * Reads the beginning of a response body, at most `maxBytes`, then cancels the stream so that a huge
 * page is not downloaded. Used where the tags are at the top of the page.
 */
export async function readTextPrefix(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => undefined);
  const bytes = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - offset);
    bytes.set(part, offset);
    offset += part.length;
  }
  return new TextDecoder().decode(bytes);
}
