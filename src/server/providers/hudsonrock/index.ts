import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { Source, SourceInspection } from "@/server/domain/source";
import { fetchByEmail, fetchByUsername } from "./client";
import { toRecords } from "./mapper";
import { hudsonRockResponseSchema } from "./schema";

async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
  const call = input.type === "EMAIL" ? fetchByEmail : input.type === "PSEUDO" ? fetchByUsername : null;
  if (!call) return { raw: null, parsed: null, records: [] };
  const raw = await call(input.value, signal);
  if (raw === null) return { raw: null, parsed: null, records: [] };
  const parsed = hudsonRockResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error("hudsonrock: invalid response");
  return { raw, parsed: parsed.data, records: toRecords(parsed.data) };
}

export const hudsonRock: Source = {
  id: "hudsonrock",
  accepts: ["EMAIL", "PSEUDO"],
  inspect,
  investigate: async (input, signal) => (await inspect(input, signal)).records,
};
