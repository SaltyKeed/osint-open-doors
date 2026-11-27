import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { Source, SourceInspection } from "@/server/domain/source";
import { lookup } from "./client";
import { toRecords } from "./mapper";
import { parseFeed } from "./parse";

/**
 * 4 calls per investigation in all, of either kind (phone or name), in queue order: the budget is shared
 * (free offer: about 1000 requests a month for about 100 visitors, T11, T13).
 */
const MAX_CALLS = 4;

/**
 * Swiss phone book (fields A1, B3, C1). By phone, it finds the address of the visitor; by name, at most
 * 3 people of that name, shown as cards to confirm. Data from search.ch, Swisscom Directories AG.
 */
export function searchCh(key: string): Source {
  async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
    if (input.type !== "TEL" && input.type !== "NOM") return { raw: null, parsed: null, records: [] };
    const raw = await lookup(input.value, input.type, key, signal);
    if (raw === null) return { raw: null, parsed: null, records: [] };
    const parsed = parseFeed(raw);
    return { raw, parsed, records: toRecords(parsed, input) };
  }

  return {
    id: "searchch",
    accepts: ["TEL", "NOM"],
    maxCallsPerInvestigation: MAX_CALLS,
    inspect,
    investigate: async (input, signal) => (await inspect(input, signal)).records,
  };
}
