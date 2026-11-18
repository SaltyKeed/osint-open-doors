import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import { found, type SourceResult } from "@/server/domain/source";
import type { LeakLookupAnswer } from "./schema";

/** One H1 value per breach name. Only the names are read: record content is never kept here. */
export function toLeakLookupResult(answer: LeakLookupAnswer, queried: Identifier): SourceResult {
  if (answer.error === "true" || typeof answer.message === "string") {
    const text = typeof answer.message === "string" ? answer.message : "";
    if (/limit/i.test(text)) return { status: "quota", records: [] };
    throw new Error("leak-lookup: API error");
  }
  return found(
    Object.keys(answer.message).map((name) => ({
      origin: name,
      evidence: null,
      values: [{ field: "H1", value: name }],
      identifiers: [{ identifier: queried }],
    })),
  );
}
