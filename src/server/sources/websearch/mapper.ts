import "server-only";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { FoundValue } from "@/server/domain/fiche";
import { fold, normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";
import { profileFromUrl } from "./profiles";
import type { TavilyResponse } from "./schema";

const EXCERPT_LENGTH = 300;

/** A search engine also returns pages that do not contain the value: they are dropped. */
export function mentions(text: string, identifier: Identifier): boolean {
  if (identifier.type === "TEL") {
    const national = parsePhoneNumberFromString(identifier.value)?.nationalNumber;
    return national !== undefined && text.replace(/\D/g, "").includes(national);
  }
  const haystack = fold(text);
  if (identifier.type === "NOM") {
    const name = fold(identifier.value);
    const reversed = name.split(" ").reverse().join(" ");
    return haystack.includes(name) || haystack.includes(reversed);
  }
  return haystack.includes(fold(identifier.value));
}

/** One record per page that names the searched value (I1), plus the account when it is a profile page. */
export function toWebRecords(body: TavilyResponse, queried: Identifier): SourceRecord[] {
  const records: SourceRecord[] = [];
  for (const result of body.results) {
    if (!mentions(`${result.title} ${result.content} ${result.raw_content ?? ""}`, queried)) continue;
    let host: string;
    try {
      host = new URL(result.url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    const excerpt = result.content.trim().slice(0, EXCERPT_LENGTH);
    const values: FoundValue[] = [
      {
        field: "I1",
        value: result.title.trim() || result.url,
        attributes: [
          { label: "Adresse", value: result.url, known: true },
          ...(excerpt ? [{ label: "Extrait", value: excerpt, known: true }] : []),
        ],
      },
    ];
    // An email or a phone written on the page: the page holds this identifier.
    const identifiers: Identifier[] = queried.type === "EMAIL" || queried.type === "TEL" ? [queried] : [];
    const profile = profileFromUrl(result.url);
    if (profile) {
      values.push(
        { field: "F2", value: profile.url, attributes: [{ label: "Service", value: profile.platform, known: true }] },
        { field: "F1", value: profile.pseudo },
      );
      const profileId = normalizeIdentifier("PROFIL", profile.url);
      const pseudoId = normalizeIdentifier("PSEUDO", profile.pseudo);
      if (profileId) identifiers.push(profileId);
      if (pseudoId) identifiers.push(pseudoId);
    }
    // A profile page is the account itself: same origin as the other sources that check it.
    const origin = profile ? (normalizeIdentifier("PROFIL", profile.url)?.value ?? host) : host;
    records.push({ origin, evidence: result.url, values, identifiers: identifiers.map((identifier) => ({ identifier })) });
  }
  return records;
}
