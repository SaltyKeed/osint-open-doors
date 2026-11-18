import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import type { Source, SourceInspection } from "@/server/domain/source";
import { fetchProfile } from "./client";
import { toRecords } from "./mapper";
import { gravatarProfileSchema } from "./schema";

async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
  if (input.type !== "EMAIL") return { raw: null, parsed: null, records: [] };
  const raw = await fetchProfile(input.value, signal);
  if (raw === null) return { raw: null, parsed: null, records: [] };
  const parsed = gravatarProfileSchema.safeParse(raw);
  if (!parsed.success) throw new Error("gravatar: invalid response");
  return { raw, parsed: parsed.data, records: toRecords(parsed.data) };
}

export const gravatar: Source = {
  id: "gravatar",
  accepts: ["EMAIL"],
  inspect,
  investigate: async (input, signal) => (await inspect(input, signal)).records,
};
