import type { Finding } from "./types";

// What each provider brought to one search (D26), to spot the providers that never
// find anything, or only things another provider already found.
export type ProviderStat = {
  providerId: string;
  shown: number; // results shown under this provider's name
  duplicates: number; // results it also found, shown under another provider
  status: "ok" | "empty" | "failed";
};

export function providerStats(findings: Finding[], queried: string[], failed: string[]): ProviderStat[] {
  const shown = new Map<string, number>();
  const duplicates = new Map<string, number>();
  const add = (map: Map<string, number>, id: string) => map.set(id, (map.get(id) ?? 0) + 1);

  for (const finding of findings) {
    add(shown, finding.providerId);
    for (const id of finding.alsoFoundBy ?? []) add(duplicates, id);
    // The web archive enriches pages found by others: counted as its own source.
    if (finding.kind === "web" && finding.archive) add(shown, "wayback");
  }

  // First the providers asked in the first step, in their order, then the second step.
  const ids = [...new Set([...queried, ...shown.keys(), ...duplicates.keys()])];
  return ids.map((providerId) => {
    const own = shown.get(providerId) ?? 0;
    const dup = duplicates.get(providerId) ?? 0;
    return {
      providerId,
      shown: own,
      duplicates: dup,
      status: failed.includes(providerId) ? "failed" : own + dup > 0 ? "ok" : "empty",
    };
  });
}
