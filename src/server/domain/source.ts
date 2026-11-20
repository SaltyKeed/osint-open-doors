import "server-only";
import type { FoundValue } from "./fiche";
import type { Identifier, IdentifierType } from "./identifier";

// The generic port (T1): one identifier in, records out. A source describes what
// it found; the engine rates it. The confidence rules are therefore written once
// (confidence.ts), not in each source.

/** "unknown" = the site did not answer clearly: never counted as found (CADRAGE.md, 7). */
export type SourceStatus = "found" | "not_found" | "unknown" | "quota" | "error" | "no_key";

/** What one record of a source contains: values for the fiche and identifiers to pivot on. */
export interface SourceRecord {
  /** Breach name, site or page host: two records of the same origin are one proof. */
  origin: string;
  /** Link to the profile or page, never a raw response. */
  evidence: string | null;
  values: FoundValue[];
  identifiers: { identifier: Identifier; thirdParty?: boolean }[];
}

export interface SourceResult {
  status: SourceStatus;
  records: SourceRecord[];
}

export interface SourceContext {
  signal: AbortSignal;
  env: Readonly<Record<string, string | undefined>>;
}

export interface Source {
  id: string;
  /** Name shown in the list of services that received the visitor's data. */
  label: string;
  accepts: readonly IdentifierType[];
  /** Environment variables needed; the source is skipped when one is missing (T1). */
  requiredEnv: readonly string[];
  /** Time allowed for one call, when the engine's default (15 seconds) is too short. */
  timeoutMs?: number;
  run(identifier: Identifier, context: SourceContext): Promise<SourceResult>;
}

export const found = (records: SourceRecord[]): SourceResult =>
  records.length > 0 ? { status: "found", records } : { status: "not_found", records: [] };
