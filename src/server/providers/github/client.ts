import "server-only";
import { fetchJson } from "@/server/providers/http";

const API = "https://api.github.com";

function headers(token: string | undefined): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub requires a User-Agent: a generic name, nothing about the visitor.
    "User-Agent": "osint-open-doors",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export function searchCommits(email: string, signal: AbortSignal, token?: string): Promise<unknown | null> {
  const query = encodeURIComponent(`author-email:${email}`);
  return fetchJson("github", `${API}/search/commits?q=${query}&per_page=30`, signal, headers(token));
}

/** Raw account, or null when no account has this login (404). */
export function getUser(login: string, signal: AbortSignal, token?: string): Promise<unknown | null> {
  return fetchJson("github", `${API}/users/${encodeURIComponent(login)}`, signal, headers(token));
}
