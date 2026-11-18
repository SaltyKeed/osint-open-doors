import "server-only";
import { found, type Source } from "@/server/domain/source";
import { toLeakCheckRecords } from "./mapper";
import { leakCheckPublicSchema } from "./schema";

// LeakCheck public API, free and without key (SOURCES.md, section 1.3). Listed as
// a duplicate of the paid Pro API; used in the prototype while the budget is not
// accepted, because XposedOrNot alone covers too few breaches.
export const leakCheckPublic: Source = {
  id: "leakcheck-public",
  label: "LeakCheck (public)",
  accepts: ["EMAIL", "PSEUDO"],
  requiredEnv: [],
  async run(identifier, { signal }) {
    const response = await fetch(`https://leakcheck.io/api/public?check=${encodeURIComponent(identifier.value)}`, {
      signal,
    });
    if (!response.ok) throw new Error(`leakcheck-public: HTTP ${response.status}`);
    const parsed = leakCheckPublicSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("leakcheck-public: invalid response");
    return found(toLeakCheckRecords(parsed.data, identifier));
  },
};
