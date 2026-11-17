import "server-only";
import type { Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceContext, type SourceRecord } from "@/server/domain/source";
import { toCommitRecords, toGithubUserRecord } from "./mapper";
import { githubCommitSearchSchema, githubUserSchema } from "./schema";

// SOURCES.md, sections 2 and 3.2. GITHUB_TOKEN is optional: without it GitHub
// allows 60 requests per hour, with it 5000.

async function get(path: string, { signal, env }: SourceContext): Promise<unknown | null> {
  const response = await fetch(`https://api.github.com${path}`, {
    signal,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "osint-open-doors",
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (response.status === 404 || response.status === 422) return null;
  // GitHub answers 403 when the rate limit is reached.
  if (response.status === 403 || response.status === 429) throw new Error("github: HTTP 429");
  if (!response.ok) throw new Error(`github: HTTP ${response.status}`);
  return response.json();
}

async function user(login: string, known: Identifier[], context: SourceContext): Promise<SourceRecord | null> {
  const body = await get(`/users/${encodeURIComponent(login)}`, context);
  if (body === null) return null;
  const parsed = githubUserSchema.safeParse(body);
  if (!parsed.success) throw new Error("github: invalid response");
  return toGithubUserRecord(parsed.data, known);
}

export const github: Source = {
  id: "github",
  label: "GitHub",
  accepts: ["EMAIL", "PSEUDO", "PROFIL"],
  requiredEnv: [],
  async run(identifier, context) {
    if (identifier.type === "EMAIL") {
      const body = await get(`/search/commits?q=${encodeURIComponent(`author-email:${identifier.value}`)}&per_page=20`, context);
      if (body === null) return found([]);
      const parsed = githubCommitSearchSchema.safeParse(body);
      if (!parsed.success) throw new Error("github: invalid response");
      const { logins, records } = toCommitRecords(parsed.data, identifier);
      const users = await Promise.all(logins.slice(0, 3).map((login) => user(login, [identifier], context)));
      return found([...records, ...users.filter((r): r is SourceRecord => r !== null)]);
    }
    const login =
      identifier.type === "PSEUDO"
        ? identifier.value
        : /^https:\/\/github\.com\/([^/]+)$/.exec(identifier.value)?.[1];
    if (!login) return found([]);
    const record = await user(login, identifier.type === "PROFIL" ? [identifier] : [], context);
    return found(record ? [record] : []);
  },
};
