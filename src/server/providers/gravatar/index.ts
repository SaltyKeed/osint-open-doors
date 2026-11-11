import "server-only";
import { createHash } from "node:crypto";
import { providerFetch } from "../http";
import type { BreachProvider } from "../types";

const PROVIDER_ID = "gravatar";

// Gravatar identifies a profile by the SHA-256 hash of the email. With d=404,
// the server answers 404 when no public avatar is linked to the address.
export const gravatar: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["email"],
  async search(query, signal) {
    if (!query.email) return [];
    const hash = createHash("sha256").update(query.email.trim().toLowerCase()).digest("hex");
    const response = await providerFetch(
      PROVIDER_ID,
      `https://www.gravatar.com/avatar/${hash}?d=404`,
      signal,
      { method: "HEAD" },
      [404],
    );
    if (response.status === 404) return [];
    return [
      {
        kind: "account",
        providerId: PROVIDER_ID,
        service: "Gravatar",
        summary:
          "Une photo de profil publique est liée à ton adresse. Beaucoup de sites (WordPress, forums, GitHub…) l'affichent automatiquement.",
        categories: ["photo"],
        matchedOn: "email",
      },
    ];
  },
};
