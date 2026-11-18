import { describe, expect, it } from "vitest";
import { normalizeIdentifier } from "@/server/domain/identifier";
import { archiveTarget, toArchiveRecord } from "./mapper";

// All values below are invented test data.
const profile = normalizeIdentifier("PROFIL", "https://instagram.com/lmartin06")!;
const domain = normalizeIdentifier("DOMAINE", "leamartin.ch")!;

describe("archiveTarget", () => {
  it("a profile is looked up as its own address, a domain with all its pages", () => {
    expect(archiveTarget(profile)).toEqual({ url: "instagram.com/lmartin06", matchType: "exact" });
    expect(archiveTarget(domain)).toEqual({ url: "leamartin.ch", matchType: "domain" });
  });
});

describe("toArchiveRecord", () => {
  it("summarises the captures: first, last, count and a link to the oldest one", () => {
    const rows = [
      ["timestamp", "original"],
      ["20190312101500", "https://www.instagram.com/lmartin06/"],
      ["20210601080000", "https://www.instagram.com/lmartin06/"],
      ["20250102090000", "https://www.instagram.com/lmartin06/"],
    ];
    const record = toArchiveRecord(rows, profile);
    expect(record?.values[0]).toEqual({
      field: "I2",
      value: "instagram.com/lmartin06",
      attributes: [
        { label: "Première capture", value: "12.03.2019", known: true },
        { label: "Dernière capture", value: "02.01.2025", known: true },
        { label: "Captures", value: "3", known: true },
        { label: "Archive", value: "https://web.archive.org/web/20190312101500/https://www.instagram.com/lmartin06/", known: true },
      ],
    });
    expect(record?.origin).toBe("Wayback Machine");
  });

  it("lists the archived pages of a domain", () => {
    const rows = [
      ["timestamp", "original"],
      ["20200101000000", "http://leamartin.ch/"],
      ["20200201000000", "http://leamartin.ch/contact"],
    ];
    const pages = toArchiveRecord(rows, domain)?.values[0]?.attributes?.find((a) => a.label === "Pages archivées");
    expect(pages?.value).toBe("http://leamartin.ch/, http://leamartin.ch/contact");
  });

  it("no capture, no record", () => {
    expect(toArchiveRecord([["timestamp", "original"]], profile)).toBeNull();
    expect(toArchiveRecord([], profile)).toBeNull();
  });
});
