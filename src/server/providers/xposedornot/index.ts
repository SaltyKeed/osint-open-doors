import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { Source, SourceInspection } from "@/server/domain/source";
import { fetchBreachAnalytics } from "./client";
import { toRecords } from "./mapper";
import { xonResponseSchema } from "./schema";

async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
  if (input.type !== "EMAIL") return { raw: null, parsed: null, records: [] };
  const raw = await fetchBreachAnalytics(input.value, signal);
  if (raw === null) return { raw: null, parsed: null, records: [] };
  const parsed = xonResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error("xposedornot: invalid response");
  return { raw, parsed: parsed.data, records: toRecords(parsed.data) };
}

export const xposedOrNot: Source = {
  id: "xposedornot",
  accepts: ["EMAIL"],
  inspect,
  // The investigation keeps only the mapped records: raw and parsed stay here.
  investigate: async (input, signal) => (await inspect(input, signal)).records,
};
