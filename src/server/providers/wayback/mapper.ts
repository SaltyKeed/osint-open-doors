import "server-only";
import type { WebArchiveInfo } from "@/server/domain/types";

// CDX answer with fl=timestamp and collapse=timestamp:4 (one capture per year):
// [["timestamp"], ["20190314..."], ["20240425..."]]
export function toArchiveInfo(rows: string[][], url: string): WebArchiveInfo | undefined {
  const timestamps = rows
    .slice(1)
    .map((row) => row[0])
    .filter((t): t is string => typeof t === "string" && /^\d{14}$/.test(t));
  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  if (!first || !last) return undefined;
  return {
    firstYear: first.slice(0, 4),
    lastYear: last.slice(0, 4),
    snapshotUrl: `https://web.archive.org/web/${last}/${url}`,
  };
}

// Live check: only a clear 404 or 410 means the page was deleted.
// Many sites block automated requests (403, 429...): that is "unknown", not "gone".
export function toLiveStatus(status: number | null): "online" | "gone" | "unknown" {
  if (status === null) return "unknown";
  if (status === 404 || status === 410) return "gone";
  if (status >= 200 && status < 400) return "online";
  return "unknown";
}
