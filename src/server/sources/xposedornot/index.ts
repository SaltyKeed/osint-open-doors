import "server-only";
import { found, type Source } from "@/server/domain/source";
import { xposedOrNot as provider } from "@/server/providers/xposedornot";
import { toXposedRecords } from "./mapper";

// Kept by T1: free and already in place. The existing provider (client, schema,
// mapper and their tests) is reused; this file only plugs it into the Source port.
export const xposedOrNot: Source = {
  id: "xposedornot",
  label: "XposedOrNot",
  accepts: ["EMAIL"],
  requiredEnv: [],
  async run(email, { signal }) {
    const exposures = await provider.search({ email: email.value }, signal);
    return found(toXposedRecords(exposures, email));
  },
};
