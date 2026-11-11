import "server-only";
import { providerFetch } from "../http";
import type { BreachProvider } from "../types";

const PROVIDER_ID = "pgp";

// keys.openpgp.org publishes a key for an email only after the owner confirmed it.
// 200 = a public key exists, 404 = none.
export const pgpKeyserver: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["email"],
  async search(query, signal) {
    if (!query.email) return [];
    const url = `https://keys.openpgp.org/vks/v1/by-email/${encodeURIComponent(query.email)}`;
    const response = await providerFetch(PROVIDER_ID, url, signal, {}, [404]);
    if (response.status === 404) return [];
    return [
      {
        kind: "account",
        providerId: PROVIDER_ID,
        service: "Serveur de clés PGP",
        summary:
          "Une clé de chiffrement publique est publiée pour ton adresse. Elle contient en général ton nom complet et reste en ligne tant que tu ne la retires pas.",
        categories: ["email", "name"],
        matchedOn: "email",
      },
    ];
  },
};
