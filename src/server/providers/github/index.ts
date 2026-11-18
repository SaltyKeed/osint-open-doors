import "server-only";
import type { z } from "zod";
import type { Identifier } from "@/server/domain/identifier";
import type { Source, SourceInspection } from "@/server/domain/source";
import { getUser, searchCommits } from "./client";
import { linkedLogin, toRecords } from "./mapper";
import { githubCommitsSchema, githubUserSchema } from "./schema";

/** At most this many accounts read for one email: bounds the number of calls. */
const MAX_ACCOUNTS = 3;

function parse<S extends z.ZodType>(schema: S, raw: unknown): z.infer<S> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error("github: invalid response");
  return parsed.data;
}

async function readUsers(logins: string[], signal: AbortSignal, token?: string) {
  const raws = (await Promise.all(logins.map((login) => getUser(login, signal, token)))).filter((raw) => raw !== null);
  return { raws, users: raws.map((raw) => parse(githubUserSchema, raw)) };
}

/** The token is optional: without it, GitHub allows fewer calls per hour (T3). */
export function github(token?: string): Source {
  async function inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> {
    if (input.type === "PSEUDO") {
      const { raws, users } = await readUsers([input.value], signal, token);
      return { raw: raws[0] ?? null, parsed: users[0] ?? null, records: toRecords(null, users) };
    }
    if (input.type !== "EMAIL") return { raw: null, parsed: null, records: [] };

    const rawCommits = await searchCommits(input.value, signal, token);
    if (rawCommits === null) return { raw: null, parsed: null, records: [] };
    const commits = parse(githubCommitsSchema, rawCommits);
    const logins = [...new Set(commits.items.map(linkedLogin).filter((l): l is string => l !== null))].slice(0, MAX_ACCOUNTS);
    const { raws, users } = await readUsers(logins, signal, token);
    return {
      raw: { commits: rawCommits, users: raws },
      parsed: { commits, users },
      records: toRecords(commits, users),
    };
  }

  return {
    id: "github",
    accepts: ["EMAIL", "PSEUDO"],
    inspect,
    investigate: async (input, signal) => (await inspect(input, signal)).records,
  };
}
