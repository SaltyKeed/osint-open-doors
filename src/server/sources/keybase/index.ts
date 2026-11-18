import "server-only";
import { z } from "zod";
import { normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import { found, type Source, type SourceRecord } from "@/server/domain/source";

const lookupSchema = z.object({
  them: z
    .array(
      z
        .object({
          basics: z.object({ username: z.string() }),
          proofs_summary: z
            .object({ all: z.array(z.object({ proof_type: z.string(), nametag: z.string() })).optional() })
            .optional(),
        })
        .nullable(),
    )
    .optional(),
});

/** Address of an account proven on Keybase; a web site or DNS proof gives a domain. */
function proven(type: string, nametag: string): Identifier | null {
  const profiles: Record<string, string> = {
    github: `https://github.com/${nametag}`,
    twitter: `https://x.com/${nametag}`,
    reddit: `https://reddit.com/user/${nametag}`,
    hackernews: `https://news.ycombinator.com/user?id=${nametag}`,
    mastodon: `https://${nametag.split("@")[1] ?? "mastodon.social"}/@${nametag.split("@")[0]}`,
  };
  if (profiles[type]) return normalizeIdentifier("PROFIL", profiles[type]);
  if (type === "generic_web_site" || type === "dns") return normalizeIdentifier("DOMAINE", nametag);
  return null;
}

/** A Keybase account publicly proves that the same person owns other accounts. */
export function toKeybaseRecord(raw: unknown, pseudo: Identifier): SourceRecord | null {
  const parsed = lookupSchema.safeParse(raw);
  const user = parsed.success ? parsed.data.them?.[0] : null;
  if (!user) return null;
  const url = `https://keybase.io/${user.basics.username}`;
  const proofs = user.proofs_summary?.all ?? [];
  const identifiers = [normalizeIdentifier("PROFIL", url), ...proofs.map((p) => proven(p.proof_type, p.nametag))].filter(
    (i): i is Identifier => i !== null,
  );
  return {
    // The account is the origin (see profiles/record.ts).
    origin: normalizeIdentifier("PROFIL", url)?.value ?? url,
    evidence: url,
    values: [
      {
        field: "F2",
        value: url,
        attributes: [
          { label: "Service", value: "Keybase", known: true },
          { label: "Pseudo", value: pseudo.value, known: true },
          ...(proofs.length > 0
            ? [{ label: "Comptes prouvés", value: proofs.map((p) => `${p.proof_type} : ${p.nametag}`).join(", "), known: true }]
            : []),
        ],
      },
    ],
    identifiers: identifiers.map((identifier) => ({ identifier })),
  };
}

// Keybase (SOURCES.md, section 2): accounts proven by the same key holder.
export const keybase: Source = {
  id: "keybase",
  label: "Keybase",
  accepts: ["PSEUDO"],
  requiredEnv: [],
  async run(pseudo, { signal }) {
    const params = new URLSearchParams({ usernames: pseudo.value, fields: "basics,proofs_summary" });
    const response = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?${params}`, { signal });
    if (response.status === 404) return found([]);
    if (!response.ok) throw new Error(`keybase: HTTP ${response.status}`);
    const record = toKeybaseRecord(await response.json(), pseudo);
    return found(record ? [record] : []);
  },
};
