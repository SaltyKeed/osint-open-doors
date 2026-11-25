import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { identifierKey, normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import type { Source, SourceField, SourceInspection, SourceRecord } from "@/server/domain/source";
import { displayName, readOgTags, readTextPrefix, type OgTags } from "../og-tags";
import { isPublicIp } from "../public-ip";
import { isWmnHost } from "../whatsmyname";
import { USER_AGENT } from "../whatsmyname/check";

const EMPTY: SourceInspection = { raw: null, parsed: null, records: [] };

/** Redirects followed by hand (301 for a trailing slash, http to https, www...). */
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);
/** The tags are at the top of the page: the rest is never downloaded. */
const MAX_BODY_BYTES = 512 * 1024;

/**
 * An address (given by the browser, or by a Location header) is opened only if it is a plain http(s) address
 * on a host of the WhatsMyName list, which is not an IP address and resolves only to public addresses. Without
 * these checks the server could be made to open a machine of the school network (SSRF, T10).
 *
 * shortcut: the host is resolved here and again by fetch, so a DNS rebinding between the two is still possible.
 * Upgrade when the source is exposed to hostile DNS: pin the checked IP with a custom undici dispatcher.
 */
async function openableAddress(value: string): Promise<string | null> {
  try {
    const url = new URL(value);
    const plain = (url.protocol === "https:" || url.protocol === "http:") && url.port === "" && url.username === "" && url.password === "";
    if (!plain || isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0 || !isWmnHost(url.hostname)) return null;
    const resolved = await lookup(url.hostname, { all: true });
    return resolved.length > 0 && resolved.every((r) => isPublicIp(r.address)) ? url.href : null;
  } catch {
    return null;
  }
}

/** Addresses and emails of a bio, without the punctuation that ends a sentence. */
function identifiersOfBio(bio: string, ownAddresses: readonly Identifier[]): Identifier[] {
  const own = new Set(ownAddresses.map(identifierKey));
  const found: Identifier[] = [];
  for (const [address] of bio.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const value = address.replace(/[.,;:)]+$/, "");
    const identifier = normalizeIdentifier("PROFIL", value);
    if (identifier && !own.has(identifierKey(identifier))) found.push({ type: "PROFIL", value });
  }
  for (const [email] of bio.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) {
    const value = email.replace(/[.,;:)]+$/, "");
    if (normalizeIdentifier("EMAIL", value)) found.push({ type: "EMAIL", value });
  }
  return found;
}

function toRecords(og: OgTags, own: readonly Identifier[]): SourceRecord[] {
  const fields: SourceField[] = [
    ...(og.title ? [{ field: "A1" as const, value: displayName(og.title) }] : []),
    ...(og.image ? [{ field: "A5" as const, value: og.image }] : []),
  ];
  const cited = og.description ? identifiersOfBio(og.description, own) : [];
  return [
    ...(fields.length > 0 ? [{ about: "subject" as const, fields, identifiers: [] }] : []),
    // A bio also cites other people (an agency, a friend): the owner of the account is not sure to own them (T10).
    ...(cited.length > 0 ? [{ about: "subject" as const, mentioned: true, fields: [], identifiers: cited }] : []),
  ];
}

/** The page of a profile, following at most MAX_REDIRECTS redirects that each pass the full check. */
async function fetchPage(start: string, signal: AbortSignal): Promise<{ html: string; url: string } | null> {
  let next = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const current = await openableAddress(next);
    if (current === null) return null;
    const response: Response = await fetch(current, {
      // Redirects are handled here, hop by hop, so that each one is checked (T10).
      redirect: "manual",
      cache: "no-store",
      signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (REDIRECT_STATUSES.has(response.status)) {
      await response.body?.cancel().catch(() => undefined);
      const location: string | null = response.headers.get("location");
      if (!location) return null;
      next = new URL(location, current).href;
      continue;
    }
    // Only a plain page is read; any other code, including an error, gives nothing.
    if (response.status !== 200) return null;
    return { html: await readTextPrefix(response, MAX_BODY_BYTES), url: current };
  }
  return null;
}

async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
  if (input.type !== "PROFIL") return EMPTY;
  try {
    const result = await fetchPage(input.value, signal);
    if (result === null) return EMPTY;
    const og = readOgTags(result.html, result.url);
    const own = [input, { type: "PROFIL" as const, value: result.url }];
    return { raw: og, parsed: og, records: toRecords(og, own) };
  } catch {
    // No message: it could contain the address of the visitor's account.
    return EMPTY;
  }
}

export const profilePage: Source = {
  id: "profile-page",
  accepts: ["PROFIL"],
  inspect,
  investigate: async (input, signal) => (await inspect(input, signal)).records,
};
