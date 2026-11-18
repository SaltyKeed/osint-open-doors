import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { Source, SourceInspection } from "@/server/domain/source";
import { search } from "./client";
import { phoneFormats, toRecords } from "./mapper";
import { tavilyResponseSchema } from "./schema";

/** Free plan: 1000 searches a month for about 200 visitors, so 3 per investigation (decided 2026-11-18). */
const MAX_SEARCHES = 3;

/**
 * Web search (field I1). Only EMAIL and TEL: a page found from a pseudo has no field to compare,
 * so it would only be counted as « possible » and waste a search.
 */
export function tavily(apiKey: string): Source {
  async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
    const forms = input.type === "EMAIL" ? [input.value] : input.type === "TEL" ? phoneFormats(input.value) : null;
    if (!forms) return { raw: null, parsed: null, records: [] };
    const raw = await search(forms.map((f) => `"${f}"`).join(" OR "), apiKey, signal);
    if (raw === null) return { raw: null, parsed: null, records: [] };
    const parsed = tavilyResponseSchema.safeParse(raw);
    if (!parsed.success) throw new Error("tavily: invalid response");
    return { raw, parsed: parsed.data, records: toRecords(parsed.data, forms) };
  }

  return {
    id: "tavily",
    accepts: ["EMAIL", "TEL"],
    maxCallsPerInvestigation: MAX_SEARCHES,
    inspect,
    investigate: async (input, signal) => (await inspect(input, signal)).records,
  };
}
