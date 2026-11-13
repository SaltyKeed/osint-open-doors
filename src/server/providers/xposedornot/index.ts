import "server-only";
import type { BreachProvider } from "@/server/providers/types";
import { fetchBreachAnalytics } from "./client";
import { toExposures } from "./mapper";
import { xonResponseSchema } from "./schema";

export const xposedOrNot: BreachProvider = {
  id: "xposedornot",
  supports: ["email"],
  async search(query, signal) {
    if (query.email === undefined) return [];
    const raw = await fetchBreachAnalytics(query.email, signal);
    if (raw === null) return [];
    const parsed = xonResponseSchema.safeParse(raw);
    if (!parsed.success) throw new Error("xposedornot: invalid response");
    return toExposures(parsed.data);
  },
};
