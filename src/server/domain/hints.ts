import "server-only";
import { fold, nameKey } from "./identifier";

/** What is already known about the volunteer: input context and detailed findings. */
export interface Reference {
  nameKeys: ReadonlySet<string>;
  cities: ReadonlySet<string>;
  birthYear: number | null;
  /** Same address only: no face recognition (CADRAGE.md, 6.4). */
  photoUrls: ReadonlySet<string>;
}

/** What a record found by a source says about its person. */
export interface Candidate {
  names?: readonly string[];
  cities?: readonly string[];
  birthYear?: number | null;
  photoUrls?: readonly string[];
}

export function emptyReference(): Reference {
  return { nameKeys: new Set(), cities: new Set(), birthYear: null, photoUrls: new Set() };
}

/** Number of consistent hints. A different birth year means another person: 0. */
export function countHints(candidate: Candidate, reference: Reference): number {
  const year = candidate.birthYear ?? null;
  if (year !== null && reference.birthYear !== null && year !== reference.birthYear) return 0;
  let hints = 0;
  if (candidate.names?.some((n) => reference.nameKeys.has(nameKey(n)))) hints += 1;
  if (candidate.cities?.some((c) => reference.cities.has(fold(c)))) hints += 1;
  if (year !== null && year === reference.birthYear) hints += 1;
  if (candidate.photoUrls?.some((p) => reference.photoUrls.has(p))) hints += 1;
  return hints;
}
