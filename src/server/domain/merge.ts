import type { Finding } from "./types";

// Several sources can report the same thing (D24): the same breach from XposedOrNot
// and LeakCheck, the same account from WhatsMyName and a profile lookup. The visitor
// must see it once, otherwise the totals on the screen are inflated. The source that
// was dropped is kept in alsoFoundBy, to measure what each provider really brings (D26).

// "Zomato.com", "zomato" and "ZOMATO" are the same breach.
export function breachKey(source: string): string {
  return source
    .toLowerCase()
    .replace(/\.(com|net|org|io|co|ru|de|fr|ch|info|me|tv|gg|ws|so)$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function profileKey(url: string, username: string): string {
  try {
    return `${new URL(url).hostname.replace(/^www\./, "")}|${username.toLowerCase()}`;
  } catch {
    return `${url}|${username.toLowerCase()}`;
  }
}

function withSources(kept: Finding, ...others: Finding[]): Finding {
  const sources = new Set(kept.alsoFoundBy ?? []);
  for (const other of others) {
    for (const id of [other.providerId, ...(other.alsoFoundBy ?? [])]) {
      if (id !== kept.providerId) sources.add(id);
    }
  }
  return sources.size > 0 ? { ...kept, alsoFoundBy: [...sources] } : kept;
}

// Keeps the first breach of each name (providers are listed best first), and for an
// account found twice, the version that has details.
export function mergeDuplicates(findings: Finding[]): Finding[] {
  const breaches = new Map<string, number>();
  const profiles = new Map<string, number>();
  const result: Finding[] = [];

  for (const finding of findings) {
    let index: number | undefined;
    if (finding.kind === "breach") {
      const key = `${finding.matchedOn}|${breachKey(finding.source)}`;
      index = breaches.get(key);
      if (index === undefined) breaches.set(key, result.length);
    } else if (finding.kind === "profile") {
      const key = profileKey(finding.url, finding.username);
      index = profiles.get(key);
      if (index === undefined) profiles.set(key, result.length);
    }

    const existing = index === undefined ? undefined : result[index];
    if (index === undefined || !existing) {
      result.push(finding);
    } else if (finding.kind === "profile" && finding.details?.length) {
      result[index] = withSources(finding, existing);
    } else {
      result[index] = withSources(existing, finding);
    }
  }
  return result;
}
