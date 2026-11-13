import { describe, expect, it } from "vitest";
import { providerStats } from "./stats";
import type { Finding } from "./types";

const breach = (providerId: string, alsoFoundBy?: string[]): Finding => ({
  kind: "breach",
  providerId,
  source: "s",
  categories: ["email"],
  matchedOn: "email",
  ...(alsoFoundBy ? { alsoFoundBy } : {}),
});

describe("providerStats", () => {
  it("counts for each source what it found alone and what another source also found", () => {
    const stats = providerStats(
      [breach("xposedornot", ["leakcheck"]), breach("xposedornot"), breach("leakcheck")],
      ["xposedornot", "leakcheck", "rdap", "tavily"],
      ["tavily"],
    );
    expect(stats).toEqual([
      { providerId: "xposedornot", shown: 2, duplicates: 0, status: "ok" },
      { providerId: "leakcheck", shown: 1, duplicates: 1, status: "ok" },
      { providerId: "rdap", shown: 0, duplicates: 0, status: "empty" },
      { providerId: "tavily", shown: 0, duplicates: 0, status: "failed" },
    ]);
  });

  it("includes the sources of the second step (archives, pivot) that were not in the first list", () => {
    const archived: Finding = {
      kind: "web",
      providerId: "tavily",
      verified: true,
      site: "x",
      url: "https://x.ch",
      title: "t",
      snippet: "",
      matchedOn: "email",
      archive: { firstYear: "2019", lastYear: "2020", snapshotUrl: "https://web.archive.org/x" },
    };
    const keybase: Finding = { kind: "account", providerId: "keybase", service: "k", summary: "", categories: [], matchedOn: "username" };
    const stats = providerStats([archived, keybase], ["tavily"], []);
    expect(stats).toEqual([
      { providerId: "tavily", shown: 1, duplicates: 0, status: "ok" },
      { providerId: "wayback", shown: 1, duplicates: 0, status: "ok" },
      { providerId: "keybase", shown: 1, duplicates: 0, status: "ok" },
    ]);
  });
});
