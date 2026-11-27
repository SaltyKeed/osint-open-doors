import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import { SourceQuotaError, type DorkContext, type DorkResult, type Source, type SourceInspection, type SourceRecord } from "@/server/domain/source";
import { search } from "./client";
import { buildDorks, keepsPage, ROMANDIE, type Dork } from "./dorks";
import { phoneFormats, toRecords } from "./mapper";
import { tavilyResponseSchema } from "./schema";

/** Free plan: 1000 searches a month for about 100 visitors: 8 in the first round, 2 in the second (T11). */
const MAX_SEARCHES = 8;

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

  async function dork(context: DorkContext, maxCalls: number, signal: AbortSignal): Promise<DorkResult> {
    const dorks = buildDorks(context);
    const kept = new Map<Dork, SourceRecord[]>();
    let calls = 0;

    // Returns the failure, if any; the pages already kept stay.
    async function send(d: Dork, query: string): Promise<DorkResult["failed"]> {
      calls++;
      try {
        const raw = await search(query, apiKey, signal, { country: "switzerland", includeDomains: d.includeDomains });
        const parsed = tavilyResponseSchema.safeParse(raw ?? { results: [] });
        if (!parsed.success) return "error";
        const pages = parsed.data.results
          .filter((r) => keepsPage(d, context.name, r))
          .map((r): SourceRecord => ({
            about: "subject",
            dork: d.kind,
            fields: [{ field: d.field, value: r.url, page: { title: r.title.trim() } }],
            identifiers: [],
          }));
        kept.set(d, [...(kept.get(d) ?? []), ...pages]);
        return undefined;
      } catch (error) {
        return error instanceof SourceQuotaError ? "quota" : "error";
      }
    }

    // First one search per dork, then the retries without the cantons with what is left of the cap.
    const sends = [
      ...dorks.map((d) => ({ d, query: d.romandie ? `${d.query} ${ROMANDIE}` : d.query, retry: false })),
      ...dorks.filter((d) => d.romandie).map((d) => ({ d, query: d.query, retry: true })),
    ];
    let failed: DorkResult["failed"];
    for (const { d, query, retry } of sends) {
      if (calls >= maxCalls) break;
      if (retry && kept.get(d)?.length) continue;
      failed = await send(d, query);
      if (failed) break;
    }
    return { calls, records: [...kept.values()].flat(), ...(failed && { failed }) };
  }

  return {
    id: "tavily",
    accepts: ["EMAIL", "TEL"],
    maxCallsPerInvestigation: MAX_SEARCHES,
    inspect,
    dork,
    investigate: async (input, signal) => (await inspect(input, signal)).records,
  };
}
