import "server-only";
import type { FieldCode } from "@/shared/fiche-fields";
import type { Identifier, IdentifierType } from "./identifier";
import type { DataCategory } from "./types";

/**
 * Details of a breach (field H1). Metadata only: "a password leaked", never the password.
 * Each kind of event gets its own closed type, added with the source that fills it (T3).
 */
export interface BreachDetails {
  /** Site that leaked, e.g. "exampleshop.test". */
  domain: string | null;
  year: number | null;
  dataTypes: DataCategory[];
  /** Number of accounts in the breach. */
  records: number | null;
  verified: boolean;
}

/**
 * Details of an infostealer infection (field H5). A minimal summary: never the computer name,
 * the IP address, file paths, logins or passwords (T3, decided 2026-11-18).
 */
export interface InfectionDetails {
  /** YYYY-MM-DD. */
  date: string | null;
  operatingSystem: string | null;
  /** Number of credentials saved on the computer, all stolen. */
  stolenCredentials: number | null;
}

/** Details of a web page found by a search (I1, or the field a dork fills): its title, never its text. */
export interface PageDetails {
  title: string;
}

/** Name and photo shown by an account (T10). Only on F2: the visitor sees them to confirm the account. */
export interface ProfileDetails {
  name?: string;
  /** Photo address, http or https. */
  photo?: string;
}

export interface SourceField {
  field: FieldCode;
  value: string;
  /** Only on H1: the value is the breach name. */
  breach?: BreachDetails;
  /** Only on H5: the value is the infection date. */
  infection?: InfectionDetails;
  /** Only on I1, or the field a dork fills (F2, G1, G3, I3, E1, D1): the value is the page address. */
  page?: PageDetails;
  /** Only on F2: the displayed name and photo of the account. */
  profile?: ProfileDetails;
  /**
   * Only on A1: the name listed for this entry, the visitor's or a relative's. The engine decides by
   * comparing it with the confirmed name (T13); the source cannot know.
   */
  holder?: boolean;
}

/** One record returned by a source: a leak line, a profile. */
export interface SourceRecord {
  /** "relative": the record is about someone close to the visitor (J1, never searched again). */
  about: "subject" | "relative";
  fields: SourceField[];
  /** Identifiers only cited in a free text (a bio): at most probable, T10. */
  mentioned?: boolean;
  /** Total number of people of this name in the source, whatever the number of entries returned (T13). */
  homonyms?: number;
  /** New identifiers the engine may search next. */
  identifiers: Identifier[];
  /** Set by a dork search: the kind decides the level, there is nothing to compare (T6). */
  dork?: DorkKind;
}

/** value: name and a confirmed value; pseudo: pseudo and platforms; keyword: name and a keyword or domains. */
export type DorkKind = "value" | "pseudo" | "keyword";

/** What the engine confirmed about the visitor, given to a source that runs dorks. */
export interface DorkContext {
  /** The NOM typed by the visitor, never one found by a source (T1). */
  name?: string;
  values: Partial<Record<"C1" | "E1" | "D1" | "ORGA", string[]>>;
  pseudo?: { value: string; rare: boolean };
  /** Second round: only the dorks about a value confirmed during this round (T9). */
  onlyValues: boolean;
}

export interface DorkResult {
  /** Searches made, to count them against the quota. */
  calls: number;
  records: SourceRecord[];
  failed?: "quota" | "error";
}

/** What a source received and what it kept. Only used by the dev console (D18). */
export interface SourceInspection {
  /** Response body as sent by the API, or null when the API was not called or found nothing. */
  raw: unknown;
  /** The same body after the zod schema: undeclared fields are gone. */
  parsed: unknown;
  records: SourceRecord[];
}

/**
 * The port: every source implements this interface. A source does not assess
 * confidence; the engine does, because only it knows which identifiers are confirmed.
 */
export interface Source {
  id: string;
  /** Identifier types this source can search. */
  accepts: readonly IdentifierType[];
  /** Pseudo sources only: number of sites in the source's list, to spot common pseudos (T4). */
  sitesChecked?: number;
  /** Paid by the request (web search): the engine stops calling it after this many calls in one investigation. */
  maxCallsPerInvestigation?: number;
  /** Replaces the 8 seconds per call of the engine, for a source that checks many sites (T7). */
  callTimeoutMs?: number;
  investigate(input: Identifier, signal: AbortSignal): Promise<SourceRecord[]>;
  inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection>;
  /** Web search sources only: runs the fixed list of dorks once the queue is empty. */
  dork?(context: DorkContext, maxCalls: number, signal: AbortSignal): Promise<DorkResult>;
}

/** Thrown on HTTP 429: the engine skips this source for the rest of the investigation (T4). */
export class SourceQuotaError extends Error {
  constructor(sourceId: string) {
    // Fixed message: no input of the visitor.
    super(`${sourceId}: quota reached`);
    this.name = "SourceQuotaError";
  }
}
