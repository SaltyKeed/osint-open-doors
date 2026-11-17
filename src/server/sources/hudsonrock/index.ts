import "server-only";
import { found, type Source } from "@/server/domain/source";
import { toHudsonRockRecords } from "./mapper";
import { hudsonRockSchema } from "./schema";

const BASE = "https://cavalier.hudsonrock.com/api/json/v2/osint-tools";

// Free, no key (SOURCES.md, section 1.1): computers infected by an info-stealer.
export const hudsonRock: Source = {
  id: "hudsonrock",
  label: "Hudson Rock",
  accepts: ["EMAIL", "PSEUDO"],
  requiredEnv: [],
  async run(identifier, { signal }) {
    const url =
      identifier.type === "EMAIL"
        ? `${BASE}/search-by-email?email=${encodeURIComponent(identifier.value)}`
        : `${BASE}/search-by-username?username=${encodeURIComponent(identifier.value)}`;
    const response = await fetch(url, { signal });
    if (response.status === 404) return found([]);
    if (!response.ok) throw new Error(`hudsonrock: HTTP ${response.status}`);
    const parsed = hudsonRockSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("hudsonrock: invalid response");
    return found(toHudsonRockRecords(parsed.data, identifier));
  },
};
