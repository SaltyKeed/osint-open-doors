import "server-only";
import { createHash } from "node:crypto";
import { providerFetch } from "../http";
import type { BreachProvider } from "../types";
import { avatarOnlyFinding, PROVIDER_ID, toProfileFinding } from "./mapper";
import { gravatarProfileSchema } from "./schema";

// Gravatar identifies a profile by the SHA-256 hash of the email.
// 1. Public profile (name, location, declared accounts) if it exists.
// 2. Otherwise, only checks whether a public avatar exists (d=404).
export const gravatar: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["email"],
  async search(query, signal) {
    if (!query.email) return [];
    const hash = createHash("sha256").update(query.email.trim().toLowerCase()).digest("hex");

    const profile = await providerFetch(PROVIDER_ID, `https://api.gravatar.com/v3/profiles/${hash}`, signal, {}, [404]);
    if (profile.ok) {
      const parsed = gravatarProfileSchema.safeParse(await profile.json());
      if (parsed.success) return [toProfileFinding(parsed.data)];
    }

    const avatar = await providerFetch(
      PROVIDER_ID,
      `https://www.gravatar.com/avatar/${hash}?d=404`,
      signal,
      { method: "HEAD" },
      [404],
    );
    return avatar.status === 404 ? [] : [avatarOnlyFinding()];
  },
};
