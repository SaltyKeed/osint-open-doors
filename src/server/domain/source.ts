import "server-only";
import type { FieldCode } from "./fiche-fields";
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

export interface SourceField {
  field: FieldCode;
  value: string;
  /** Only on H1: the value is the breach name. */
  breach?: BreachDetails;
}

/** One record returned by a source: a leak line, a profile. */
export interface SourceRecord {
  /** "relative": the record is about someone close to the visitor (J1, never searched again). */
  about: "subject" | "relative";
  fields: SourceField[];
  /** New identifiers the engine may search next. */
  identifiers: Identifier[];
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
  investigate(input: Identifier, signal: AbortSignal): Promise<SourceRecord[]>;
  inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection>;
}
