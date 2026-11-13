import type { Exposure, QueryKind, SearchQuery } from "@/server/domain/types";

/** The port: every breach source implements this interface. */
export interface BreachProvider {
  id: string;
  supports: readonly QueryKind[];
  search(query: SearchQuery, signal: AbortSignal): Promise<Exposure[]>;
}
