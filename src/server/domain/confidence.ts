import "server-only";
import type { Identifier, IdentifierType } from "./identifier";

/** From the surest to the least sure (CADRAGE.md, section 7). */
export const CONFIDENCE_LEVELS = ["confirmed", "probable", "possible", "namesake"] as const;

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
function capAt(confidence: Confidence, ceiling: Confidence): Confidence {
  return rank(confidence) > rank(ceiling) ? confidence : ceiling;
}

function levelFromQuery(evidence: Evidence): Confidence {
  const { queried, rarePseudo, coherentHints } = evidence;
  if (UNIQUE_TYPES.has(queried.type)) return queried.confidence;
  if (queried.type === "PSEUDO") return rarePseudo && coherentHints > 0 ? "probable" : "possible";
  if (queried.type === "NOM") return coherentHints > 0 ? "possible" : "namesake";
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
