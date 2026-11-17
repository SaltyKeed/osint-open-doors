import "server-only";
import { fold, UNIQUE_TYPES, type IdentifierType } from "./identifier";

/** From the weakest to the strongest (CADRAGE.md, section 7). */
export const CONFIDENCE_LEVELS = ["homonyme", "possible", "probable", "confirme"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export interface RecordEvidence {
  /** The identifier given to the source, and its own confidence. */
  queried: { type: IdentifierType; confidence: Confidence };
  /** The record contains an EMAIL, TEL, PROFIL or DOMAINE already confirmed. */
  linksToConfirmed: boolean;
  /** Only meaningful when the queried identifier is a PSEUDO. */
  rarePseudo: boolean;
  /** Consistent hints: same name, city, birth year or photo. */
  hints: number;
}

const rank = (level: Confidence) => CONFIDENCE_LEVELS.indexOf(level);

/** Fixed rules, written once here and not in each source (D25, T1). */
export function assessConfidence(e: RecordEvidence): Confidence {
  if (e.linksToConfirmed) return "confirme";
  if (UNIQUE_TYPES.has(e.queried.type)) return e.queried.confidence;
  if (e.queried.type === "PSEUDO") return e.rarePseudo && e.hints >= 1 ? "probable" : "possible";
  // NOM, IP, ORGA: shared by several people, never more than possible.
  return e.hints >= 1 ? "possible" : "homonyme";
}

/**
 * Level of a value found several times: the best one, raised one step (once)
 * when at least two independent origins found it. A namesake is never raised:
 * two sources can find the same other person.
 */
export function combineConfidence(sightings: readonly { confidence: Confidence; origin: string }[]): Confidence {
  const best = sightings.reduce<Confidence>(
    (acc, s) => (rank(s.confidence) > rank(acc) ? s.confidence : acc),
    "homonyme",
  );
  if (best === "homonyme" || best === "confirme") return best;
  const origins = new Set(sightings.map((s) => fold(s.origin)));
  return origins.size >= 2 ? (CONFIDENCE_LEVELS[rank(best) + 1] ?? best) : best;
}

/** Only confirmed and probable values are shown in detail and relaunch a search. */
export function isDetailed(level: Confidence): boolean {
  return level === "confirme" || level === "probable";
}
