import "server-only";
import { createHash } from "node:crypto";
import { fetchJson } from "@/server/providers/http";

const BASE_URL = "https://api.gravatar.com/v3/profiles";

/** Raw profile, or null when no profile exists (404). Gravatar receives a hash, never the email. */
export function fetchProfile(email: string, signal: AbortSignal): Promise<unknown | null> {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return fetchJson("gravatar", `${BASE_URL}/${hash}`, signal);
}
