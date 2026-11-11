import "server-only";
import { z } from "zod";
import type { AccountFinding } from "@/server/domain/types";

const PROVIDER_ID = "keybase";

// Shape of GET https://keybase.io/_/api/1.0/user/lookup.json (fields we use).
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

export function toKeybaseFinding(raw: unknown, origin: string): AccountFinding[] {
  const parsed = lookupSchema.safeParse(raw);
  const user = parsed.success ? parsed.data.them?.[0] : null;
  if (!user) return [];
  const proofs = user.proofs_summary?.all ?? [];
  const services = [...new Set(proofs.map((p) => p.proof_type))];
  return [
    {
      kind: "account",
      providerId: PROVIDER_ID,
      service: `Keybase @${user.basics.username}`,
      summary:
        `Un compte Keybase existe avec ce pseudo (trouvé grâce à ${origin === "pseudo" ? "ton pseudo" : origin}).` +
        (services.length > 0
          ? ` Il prouve publiquement qu'il possède aussi des comptes : ${services.join(", ")}.`
          : " Il ne relie aucun autre compte.") +
        " Le même pseudo peut appartenir à quelqu'un d'autre.",
      categories: ["username"],
      matchedOn: "username",
      handles: proofs.map((p) => p.nametag),
    },
  ];
}

// Keybase links an account to other accounts with public, signed proofs.
export async function keybaseLookup(username: string, origin: string, signal: AbortSignal): Promise<AccountFinding[]> {
  try {
    const params = new URLSearchParams({ usernames: username, fields: "basics,proofs_summary" });
    const response = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?${params}`, { signal, cache: "no-store" });
    if (!response.ok) return [];
    return toKeybaseFinding(await response.json(), origin);
  } catch {
    return [];
  }
}
