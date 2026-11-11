import { describe, expect, it } from "vitest";
import { toArchiveInfo, toLiveStatus } from "./mapper";

describe("wayback mapper", () => {
  it("reads the first and last archived years", () => {
    const rows = [["timestamp"], ["20190314120000"], ["20210101000000"], ["20240425070539"]];
    expect(toArchiveInfo(rows, "https://club.example/membres")).toEqual({
      firstYear: "2019",
      lastYear: "2024",
      snapshotUrl: "https://web.archive.org/web/20240425070539/https://club.example/membres",
    });
  });

  it("returns nothing when the page was never archived", () => {
    expect(toArchiveInfo([], "https://club.example")).toBeUndefined();
    expect(toArchiveInfo([["timestamp"]], "https://club.example")).toBeUndefined();
  });

  it("treats only 404 and 410 as deleted", () => {
    expect(toLiveStatus(404)).toBe("gone");
    expect(toLiveStatus(410)).toBe("gone");
    expect(toLiveStatus(200)).toBe("online");
    expect(toLiveStatus(403)).toBe("unknown");
    expect(toLiveStatus(null)).toBe("unknown");
  });
});
