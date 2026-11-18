import "server-only";
import { found, type Source } from "@/server/domain/source";
import { xposedOrNot as provider } from "@/server/providers/xposedornot";
import { checkEmailSchema, toCheckEmailRecords, toXposedRecords } from "./mapper";

/** Second route of XposedOrNot. A failure here keeps the analytics result. */
async function checkEmail(email: string, signal: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`, { signal });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

// Kept by T1: free and already in place. The existing provider (client, schema,
// mapper and their tests) is reused; this file only plugs it into the Source port
// and adds the check-email route, which sometimes lists other breaches.
export const xposedOrNot: Source = {
  id: "xposedornot",
  label: "XposedOrNot",
  accepts: ["EMAIL"],
  requiredEnv: [],
  async run(email, { signal }) {
    const [exposures, extra] = await Promise.all([
      provider.search({ email: email.value }, signal),
      checkEmail(email.value, signal),
    ]);
    const records = toXposedRecords(exposures, email);
    const parsed = checkEmailSchema.safeParse(extra);
    const already = new Set(exposures.map((e) => e.source.toLowerCase()));
    return found([...records, ...(parsed.success ? toCheckEmailRecords(parsed.data, email, already) : [])]);
  },
};
