import "server-only";
import type { Finding, WebFinding } from "@/server/domain/types";
import { toArchiveInfo, toLiveStatus } from "./mapper";

const MAX_PAGES = 20;
const CONCURRENCY = 10;

async function archiveRows(url: string, signal: AbortSignal): Promise<string[][]> {
  const params = new URLSearchParams({
    url,
    output: "json",
    fl: "timestamp",
    collapse: "timestamp:4", // one capture per year
    filter: "statuscode:200",
  });
  const response = await fetch(`https://web.archive.org/cdx/search/cdx?${params}`, { signal, cache: "no-store" });
  if (!response.ok) return [];
  const body: unknown = await response.json().catch(() => []);
  return Array.isArray(body) ? (body as string[][]) : [];
}

async function liveStatus(url: string, signal: AbortSignal): Promise<number | null> {
  try {
    const response = await fetch(url, { method: "HEAD", signal, cache: "no-store", redirect: "follow" });
    return response.status;
  } catch {
    return null;
  }
}

async function enrichOne(finding: WebFinding, signal: AbortSignal): Promise<WebFinding> {
  const [rows, status] = await Promise.all([
    archiveRows(finding.url, signal).catch(() => []),
    liveStatus(finding.url, signal),
  ]);
  return { ...finding, archive: toArchiveInfo(rows, finding.url), live: toLiveStatus(status) };
}

// Second step after the search: for the web pages found, asks the Wayback Machine
// since when they are archived, and checks whether they still exist. A deleted page
// often stays readable in the archive. Verified pages are checked first.
export async function enrichWithArchive(findings: Finding[], signal: AbortSignal): Promise<Finding[]> {
  const pages = findings
    .filter((f): f is WebFinding => f.kind === "web")
    .sort((a, b) => Number(b.verified) - Number(a.verified))
    .slice(0, MAX_PAGES);

  const enriched = new Map<string, WebFinding>();
  for (let i = 0; i < pages.length; i += CONCURRENCY) {
    const batch = pages.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((page) => enrichOne(page, signal)));
    results.forEach((result) => {
      if (result.status === "fulfilled") enriched.set(result.value.url, result.value);
    });
    if (signal.aborted) break;
  }

  return findings.map((f) => (f.kind === "web" ? (enriched.get(f.url) ?? f) : f));
}
