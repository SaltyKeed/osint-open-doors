import "server-only";
import type { Identifier, IdentifierType } from "./identifier";

/** From the surest to the least sure (CADRAGE.md, section 7). */
export const CONFIDENCE_LEVELS = ["confirmed", "probable", "to_confirm", "possible", "namesake"] as const;

/** Up to this many people of the same name in a source, each one is shown as a card to confirm (T13). */
export const MAX_HOMONYMS = 3;

/** At most this many web pages found by a keyword dork are shown as cards to confirm (T6). */
export const MAX_PAGE_CARDS = 3;

/** Web searches left to the dorks about a value confirmed in the second round (T11). */
export const ROUND_TWO_DORK_CALLS = 2;

export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** What the engine knows about a record returned by a source. */
export interface Evidence {
  /** The identifier given to the source, with its own confidence. */
  queried: { type: IdentifierType; confidence: Confidence };
  /** The record also contains an EMAIL, TEL or PROFIL already confirmed. */
  linkedToConfirmed: boolean;
  rarePseudo: boolean;
  /** Same city, same photo, same name, same year... counted by the engine. */
  coherentHints: number;
  /** The source only checks that an account with this pseudo exists on a list of sites: it returns an address, nothing else (T7). */
  existenceCheck?: boolean;
  /** The source knows at most MAX_HOMONYMS people of the searched name (T13). */
  fewHomonyms?: boolean;
}

export interface Lead {
  identifier: Identifier;
  confidence: Confidence;
  about: "subject" | "relative";
  /** Confidence of the identifier whose search found this one. */
  foundFrom: Confidence;
}

const UNIQUE_TYPES: ReadonlySet<IdentifierType> = new Set(["EMAIL", "TEL", "PROFIL", "DOMAINE"]);

function rank(confidence: Confidence): number {
  return CONFIDENCE_LEVELS.indexOf(confidence);
}

/** The less sure of two levels. */
export function capAt(confidence: Confidence, ceiling: Confidence): Confidence {
  return rank(confidence) > rank(ceiling) ? confidence : ceiling;
}

function levelFromQuery(evidence: Evidence): Confidence {
  const { queried, rarePseudo, coherentHints } = evidence;
  if (UNIQUE_TYPES.has(queried.type)) return queried.confidence;
  if (queried.type === "PSEUDO") {
    if (!rarePseudo) return "possible";
    if (coherentHints > 0) return "probable";
    // T9: a rare pseudo does not say that this account is the visitor's, so the visitor decides. Only for an
    // address: a full profile (name, email, city) of a stranger is never shown.
    return evidence.existenceCheck === true ? "to_confirm" : "possible";
  }
  if (queried.type === "NOM") {
    if (coherentHints > 0) return "possible";
    return evidence.fewHomonyms === true ? "to_confirm" : "namesake";
  }
  return "possible"; // IP and ORGA are shared by many people.
}

export function assessConfidence(evidence: Evidence): Confidence {
  // A record holding an identifier we already confirmed belongs to the person, whatever found it.
  if (evidence.linkedToConfirmed) return "confirmed";
  // A result is never surer than the identifier that found it.
  return capAt(levelFromQuery(evidence), evidence.queried.confidence);
}

/** Only these levels are shown in detail; the others are shown as a count. */
export function isDetailed(confidence: Confidence): boolean {
  return confidence === "confirmed" || confidence === "probable";
}

export function shouldRebound(lead: Lead): boolean {
  if (lead.identifier.type === "NOM" || lead.about === "relative") return false;
  // One level only: what a probable identifier finds must be confirmed to search again.
  if (lead.foundFrom === "probable") return lead.confidence === "confirmed";
  return isDetailed(lead.confidence);
}
