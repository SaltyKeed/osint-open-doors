import "server-only";
import { z } from "zod";
import { found, type Source } from "@/server/domain/source";
import { archiveTarget, toArchiveRecord } from "./mapper";

const rowsSchema = z.array(z.array(z.string()));

// Wayback Machine CDX API, free and without key (SOURCES.md, section 7).
export const wayback: Source = {
  id: "wayback",
  label: "Wayback Machine",
  accepts: ["PROFIL", "DOMAINE"],
  requiredEnv: [],
  async run(identifier, { signal }) {
    const target = archiveTarget(identifier);
    const params = new URLSearchParams({
      url: target.url,
      matchType: target.matchType,
      output: "json",
      fl: "timestamp,original",
      filter: "statuscode:200",
      // A profile: at most one capture a month. A domain: one line per page.
      collapse: target.matchType === "exact" ? "timestamp:6" : "urlkey",
      limit: "200",
    });
    const response = await fetch(`https://web.archive.org/cdx/search/cdx?${params}`, { signal });
    if (!response.ok) throw new Error(`wayback: HTTP ${response.status}`);
    const text = await response.text();
    const parsed = rowsSchema.safeParse(text.trim() ? JSON.parse(text) : []);
    if (!parsed.success) throw new Error("wayback: invalid response");
    const record = toArchiveRecord(parsed.data, identifier);
    return found(record ? [record] : []);
  },
};
