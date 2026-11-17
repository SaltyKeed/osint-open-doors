import "server-only";
import { createHash } from "node:crypto";
import { found, type Source } from "@/server/domain/source";
import { toGravatarRecord } from "./mapper";
import { gravatarProfileSchema } from "./schema";

// GET https://api.gravatar.com/v3/profiles/{sha256 of the email} (SOURCES.md, section 2).
// Works without a key; GRAVATAR_API_KEY only raises the rate limit.
export const gravatar: Source = {
  id: "gravatar",
  label: "Gravatar",
  accepts: ["EMAIL"],
  requiredEnv: [],
  async run(email, { signal, env }) {
    const hash = createHash("sha256").update(email.value).digest("hex");
    const response = await fetch(`https://api.gravatar.com/v3/profiles/${hash}`, {
      signal,
      headers: env.GRAVATAR_API_KEY ? { Authorization: `Bearer ${env.GRAVATAR_API_KEY}` } : {},
    });
    if (response.status === 404) return found([]);
    if (!response.ok) throw new Error(`gravatar: HTTP ${response.status}`);
    const parsed = gravatarProfileSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("gravatar: invalid response");
    return found([toGravatarRecord(parsed.data, email)]);
  },
};
