import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { Source, SourceRecord } from "@/server/domain/source";

export interface SearchResult {
  records: SourceRecord[];
  failedSources: string[];
}

// Each identifier goes to the sources that accept its type, without rebound (the engine adds them, #65).
// A failing or slow source does not block the others: the visitor gets a partial result.
export async function searchAll(
  identifiers: readonly Identifier[],
  sources: readonly Source[],
  timeoutMs = 8000,
): Promise<SearchResult> {
  const calls = identifiers.flatMap((input) =>
    sources.filter((s) => s.accepts.includes(input.type)).map((source) => ({ source, input })),
  );
  const signal = AbortSignal.timeout(timeoutMs);
  const settled = await Promise.allSettled(calls.map(({ source, input }) => source.investigate(input, signal)));

  const records: SourceRecord[] = [];
  const failed = new Set<string>();
  settled.forEach((outcome, i) => {
    const id = calls[i]!.source.id;
    if (outcome.status === "fulfilled") {
      records.push(...outcome.value);
    } else if (!failed.has(id)) {
      failed.add(id);
      // Source id only: an error message could contain the visitor's input.
      console.error(`[search] source failed: ${id}`);
    }
  });
  return { records, failedSources: [...failed] };
}
