import "server-only";
import type { BreachProvider, Inspection } from "@/server/providers/types";
import { fetchBreachAnalytics } from "./client";
import { toExposures } from "./mapper";
import { xonResponseSchema } from "./schema";

async function inspect(query: Parameters<BreachProvider["search"]>[0], signal: AbortSignal): Promise<Inspection> {
  if (query.email === undefined) return { raw: null, parsed: null, exposures: [] };
  const raw = await fetchBreachAnalytics(query.email, signal);
  if (raw === null) return { raw: null, parsed: null, exposures: [] };
  const parsed = xonResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error("xposedornot: invalid response");
  return { raw, parsed: parsed.data, exposures: toExposures(parsed.data) };
}

export const xposedOrNot: BreachProvider = {
  id: "xposedornot",
  supports: ["email"],
  inspect,
  // The public search keeps only the mapped exposures: raw and parsed stay here.
  search: async (query, signal) => (await inspect(query, signal)).exposures,
};
