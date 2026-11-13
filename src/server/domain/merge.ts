import type { Finding } from "./types";

// Several sources can report the same thing (D24): the same breach from XposedOrNot
// and LeakCheck, the same account from WhatsMyName and a profile lookup. The visitor
// must see it once, otherwise the totals on the screen are inflated.

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

// Keeps the first breach of each name (providers are listed best first), and for an
// account found twice, the version that has details.
export function mergeDuplicates(findings: Finding[]): Finding[] {
  const breaches = new Set<string>();
  const profiles = new Map<string, number>();
  const result: Finding[] = [];

  for (const finding of findings) {
    if (finding.kind === "breach") {
      const key = `${finding.matchedOn}|${breachKey(finding.source)}`;
      if (breaches.has(key)) continue;
      breaches.add(key);
    } else if (finding.kind === "profile") {
      const key = profileKey(finding.url, finding.username);
      const index = profiles.get(key);
      if (index !== undefined) {
        if (finding.details?.length) result[index] = finding;
        continue;
      }
      profiles.set(key, result.length);
    }
    result.push(finding);
  }
  return result;
}
