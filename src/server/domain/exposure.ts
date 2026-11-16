import { sortCategories } from "./categories";
import type { DataCategory, Finding, QueryKind } from "./types";

// The results seen the other way round (D30): for each kind of data (password, address,
// bank card...), where it was exposed. Only results surely linked to the visitor are
// used: breaches, directory listings and accounts. Pages and profiles found by name or
// username are leads (D17, D19) and are left out.

export type ExposureSource = {
  label: string; // breach name, directory or service
  kind: "breach" | "directory" | "account";
  providerId: string;
  matchedOn: QueryKind;
  year?: string;
};

export type Exposure = {
  category: DataCategory;
  sources: ExposureSource[];
  latestYear?: string;
};

function sourceOf(finding: Finding): ExposureSource | undefined {
  const base = { providerId: finding.providerId, matchedOn: finding.matchedOn };
  if (finding.kind === "breach") return { ...base, kind: "breach", label: finding.source, year: finding.year };
  if (finding.kind === "directory") return { ...base, kind: "directory", label: finding.source };
  if (finding.kind === "account") return { ...base, kind: "account", label: finding.service };
  return undefined;
}

const byYearDesc = (a: ExposureSource, b: ExposureSource) => (b.year ?? "").localeCompare(a.year ?? "");

export function groupByCategory(findings: Finding[]): Exposure[] {
  const groups = new Map<DataCategory, ExposureSource[]>();
  for (const finding of findings) {
    const source = sourceOf(finding);
    if (!source || !("categories" in finding)) continue;
    for (const category of new Set(finding.categories)) {
      groups.set(category, [...(groups.get(category) ?? []), source]);
    }
  }
  return sortCategories([...groups.keys()]).map((category) => {
    const sources = [...(groups.get(category) ?? [])].sort(byYearDesc);
    return { category, sources, latestYear: sources.find((s) => s.year)?.year };
  });
}
