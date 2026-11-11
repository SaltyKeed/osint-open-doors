import "server-only";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { Finding } from "@/server/domain/types";
import { type BreachProvider, ProviderError } from "../types";
import { searchChQuery } from "./client";
import { PROVIDER_ID, toDirectoryFindings, toNameCount } from "./mapper";
import { parseFeed } from "./schema";

export function createSearchChProvider(apiKey: string | undefined): BreachProvider {
  async function feed(params: Record<string, string>, signal: AbortSignal) {
    if (!apiKey) throw new ProviderError(PROVIDER_ID, "missing-key");
    const parsed = parseFeed(await searchChQuery(apiKey, params, signal));
    if (!parsed) throw new ProviderError(PROVIDER_ID, "invalid-response");
    return parsed;
  }

  return {
    id: PROVIDER_ID,
    tier: "surface",
    supports: ["phone", "name"],
    async search(query, signal) {
      const tasks: Promise<Finding[]>[] = [];
      if (query.phone) {
        const national = parsePhoneNumberFromString(query.phone)?.formatNational().replace(/\D/g, "");
        tasks.push(
          feed({ was: national ?? query.phone, maxnum: "10" }, signal).then((f) =>
            toDirectoryFindings(f, query),
          ),
        );
      }
      if (query.firstName && query.lastName) {
        tasks.push(
          feed({ was: `${query.firstName} ${query.lastName}`, count_only: "1" }, signal).then((f) => {
            const count = toNameCount(f);
            return count ? [count] : [];
          }),
        );
      }
      return (await Promise.all(tasks)).flat();
    },
  };
}
