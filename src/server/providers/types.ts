import type { Exposure, QueryKind, SearchQuery } from "@/server/domain/types";

/** What a provider received and what it kept. Only used by the dev console (D18). */
export interface Inspection {
  /** Response body as sent by the API, or null when the API was not called or found nothing. */
  raw: unknown;
  /** The same body after the zod schema: undeclared fields are gone. */
  parsed: unknown;
  exposures: Exposure[];
}

/** The port: every breach source implements this interface. */
export interface BreachProvider {
  id: string;
  supports: readonly QueryKind[];
  search(query: SearchQuery, signal: AbortSignal): Promise<Exposure[]>;
  inspect(query: SearchQuery, signal: AbortSignal): Promise<Inspection>;
}
