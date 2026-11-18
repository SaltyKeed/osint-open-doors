import { describe, expect, it } from "vitest";
import { normalizeIdentifier } from "@/server/domain/identifier";
import { toPlatformRecord } from "../profiles/record";
import { evaluate, prepareUsername, profileUrl, sortSites } from "./mapper";
import { loadSites, type WmnSite } from "./sites";

// Invented sites (fixtures never contain real data).
const site = (over: Partial<WmnSite>): WmnSite => ({
  name: "ExampleSocial",
  uri_check: "https://social.example/user/{account}",
  e_code: 200,
  e_string: "profile-header",
  m_code: 404,
  m_string: "Not found",
  cat: "social",
  ...over,
});

describe("whatsmyname", () => {
  it("applies the rule of the list: exists, missing, or unknown (never reported)", () => {
    const s = site({});
    expect(evaluate(s, 200, "<div class=profile-header>")).toBe("found");
    expect(evaluate(s, 404, "Not found")).toBe("missing");
    expect(evaluate(s, 200, "a login wall")).toBe("unknown");
    expect(evaluate(s, 403, "blocked")).toBe("unknown");
  });

  it("checks the most useful categories first", () => {
    const sorted = sortSites([site({ name: "Game", cat: "gaming" }), site({ name: "Misc", cat: "misc" }), site({ name: "Social" })]);
    expect(sorted.map((s) => s.name)).toEqual(["Social", "Game", "Misc"]);
  });

  it("builds the profile address and strips forbidden characters", () => {
    expect(profileUrl("https://social.example/user/{account}", "j.dupont")).toBe("https://social.example/user/j.dupont");
    expect(prepareUsername(site({ strip_bad_char: "." }), "j.dupont")).toBe("jdupont");
  });

  it("the frozen list has hundreds of https sites, without adult or dating sites", () => {
    const sites = loadSites();
    expect(sites.length).toBeGreaterThan(500);
    expect(sites.every((s) => s.uri_check.startsWith("https://"))).toBe(true);
    expect(sites.some((s) => s.cat === "xx NSFW xx" || s.cat === "dating")).toBe(false);
  });
});

describe("toPlatformRecord", () => {
  it("an account found with a pseudo is an F2 value and a PROFIL to pivot on", () => {
    const pseudo = normalizeIdentifier("PSEUDO", "lmartin06")!;
    const record = toPlatformRecord(
      { site: "Chess.com", category: "gaming", url: "https://www.chess.com/member/lmartin06", details: ["Compte créé en 2021"] },
      pseudo,
    );
    expect(record).toEqual({
      origin: "Chess.com",
      evidence: "https://www.chess.com/member/lmartin06",
      values: [
        {
          field: "F2",
          value: "https://www.chess.com/member/lmartin06",
          attributes: [
            { label: "Service", value: "Chess.com", known: true },
            { label: "Catégorie", value: "gaming", known: true },
            { label: "Pseudo", value: "lmartin06", known: true },
            { label: "Détail", value: "Compte créé en 2021", known: true },
          ],
        },
      ],
      identifiers: [{ identifier: { type: "PROFIL", value: "https://chess.com/member/lmartin06" } }],
    });
  });
});
