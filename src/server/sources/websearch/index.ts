import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";
import { extractFacts, MAX_PAGES, type PageText } from "./extract";
import { toWebRecords } from "./mapper";
import { planQueries } from "./queries";
import { tavilyResponseSchema } from "./schema";

// Tavily, main search engine (SOURCES.md, section 4). Basic search: 1 credit per
// query, 1000 free credits a month. Skipped while TAVILY_API_KEY is missing.
// With OPENAI_API_KEY, GPT-6.2 Astra also reads the pages (D26, prototype only).
export const webSearch: Source = {
  id: "tavily",
  label: "Tavily (recherche web)",
  accepts: ["EMAIL", "TEL", "PSEUDO", "NOM"],
  requiredEnv: ["TAVILY_API_KEY"],
  // The reading by Astra takes longer than the default 15 seconds.
  timeoutMs: 45_000,
  async run(identifier, { signal, env }) {
    const texts = new Map<string, PageText>();
    const pages = await Promise.all(
      planQueries(identifier).map(async (planned) => {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          signal,
          headers: { Authorization: `Bearer ${env.TAVILY_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: planned.query,
            max_results: planned.maxResults,
            search_depth: "basic",
            include_domains: planned.includeDomains,
            include_raw_content: "text",
          }),
        });
        // 432 and 433: plan or monthly credit limit reached.
        if ([429, 432, 433].includes(response.status)) throw new Error("tavily: HTTP 429");
        if (!response.ok) throw new Error(`tavily: HTTP ${response.status}`);
        const parsed = tavilyResponseSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("tavily: invalid response");
        // Page texts stay in memory for the reading by Astra, never in a record.
        for (const result of parsed.data.results) {
          texts.set(result.url, { title: result.title, text: result.raw_content || result.content });
        }
        return toWebRecords(parsed.data, identifier);
      }),
    );
    // The same page found by two queries is kept once.
    const byUrl = new Map<string, SourceRecord>();
    for (const record of pages.flat()) byUrl.set(record.evidence ?? record.origin, record);
    const records = [...byUrl.values()];
    if (env.OPENAI_API_KEY) await addExtractedValues(records, texts, identifier, signal, env.OPENAI_API_KEY);
    return found(records);
  },
};

/** Adds what Astra read on each page to the page's record. Without an answer, the pages stay as they are. */
async function addExtractedValues(
  records: SourceRecord[],
  texts: ReadonlyMap<string, PageText>,
  identifier: Identifier,
  signal: AbortSignal,
  apiKey: string,
): Promise<void> {
  const read = records
    .slice(0, MAX_PAGES)
    .map((record) => ({ record, page: record.evidence ? texts.get(record.evidence) : undefined }))
    .filter((entry): entry is { record: SourceRecord; page: PageText } => entry.page !== undefined);
  if (read.length === 0) return;
  try {
    const values = await extractFacts(
      read.map((entry) => entry.page),
      identifier,
      { signal, apiKey },
    );
    read.forEach((entry, index) => entry.record.values.push(...(values[index] ?? [])));
  } catch {
    // Refusal, quota or timeout of Astra: the Tavily results are still shown.
  }
}
