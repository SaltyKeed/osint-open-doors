import "server-only";
import type { Source } from "@/server/domain/source";
import { toLeakLookupResult } from "./mapper";
import { leakLookupSchema } from "./schema";

// POST https://leak-lookup.com/api/search (SOURCES.md, section 1.1). The API
// refuses multipart forms (HTTP 403): the body must be url-encoded. The public
// key allows 10 searches a day, so only the email and the pseudo are searched.
const TYPES = { EMAIL: "email_address", PSEUDO: "username" } as const;

export const leakLookup: Source = {
  id: "leak-lookup",
  label: "Leak-Lookup",
  accepts: ["EMAIL", "PSEUDO"],
  requiredEnv: ["LEAK_LOOKUP_API_KEY"],
  async run(identifier, { signal, env }) {
    const type = TYPES[identifier.type as keyof typeof TYPES];
    const response = await fetch("https://leak-lookup.com/api/search", {
      method: "POST",
      signal,
      body: new URLSearchParams({ key: env.LEAK_LOOKUP_API_KEY ?? "", type, query: identifier.value }),
    });
    if (!response.ok) throw new Error(`leak-lookup: HTTP ${response.status}`);
    const parsed = leakLookupSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("leak-lookup: invalid response");
    return toLeakLookupResult(parsed.data, identifier);
  },
};
