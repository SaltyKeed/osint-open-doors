import "server-only";
import type { Finding } from "@/server/domain/types";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";
import { PROVIDER_ID, toFindings, toNameFindings, toUsernameFindings } from "./mapper";

const URL = "https://api.dehashed.com/v2/search";
// One request costs one credit: at most 100 records per query is plenty for one person.
const PAGE_SIZE = 100;
const MIN_USERNAME_LENGTH = 6;

// DeHashed (D31): search in stolen databases by email, phone, name and username.
// Paid: a search subscription plus API credits. The key stays in .env.deep.
export function createDeHashedProvider(apiKey: string): BreachProvider {
  async function search(query: string, signal: AbortSignal): Promise<unknown> {
    const response = await providerFetch(PROVIDER_ID, URL, signal, {
      method: "POST",
      headers: { "Dehashed-Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, page: 1, size: PAGE_SIZE, de_dupe: true }),
    });
    const raw: unknown = await response.json().catch(() => undefined);
    if (raw === undefined) throw new ProviderError(PROVIDER_ID, "invalid-response");
    return raw;
  }

  // Quotes keep the value as one term; inner quotes are removed.
  const term = (field: string, value: string) => `${field}:"${value.replace(/"/g, "")}"`;

  return {
    id: PROVIDER_ID,
    tier: "deep",
    supports: ["email", "phone", "name", "username"],
    async search(query, signal) {
      const tasks: Promise<Finding[]>[] = [];
      if (query.email) tasks.push(search(term("email", query.email), signal).then((r) => toFindings(r, "email")));
      if (query.phone) {
        tasks.push(search(term("phone", query.phone.replace(/\D/g, "")), signal).then((r) => toFindings(r, "phone")));
      }
      if (query.firstName && query.lastName) {
        const name = `${query.firstName} ${query.lastName}`;
        tasks.push(search(term("name", name), signal).then((r) => toNameFindings(r, query)));
      }
      if (query.username && query.username.length >= MIN_USERNAME_LENGTH) {
        tasks.push(search(term("username", query.username), signal).then((r) => toUsernameFindings(r, query.username ?? "")));
      }
      return (await Promise.all(tasks)).flat();
    },
  };
}
