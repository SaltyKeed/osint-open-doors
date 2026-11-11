import { describe, expect, it } from "vitest";
import { evaluate, prepareUsername, profileUrl, selectSites } from "./mapper";
import type { WmnSite } from "./schema";

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

describe("whatsmyname mapper", () => {
  it("applies the dataset rule", () => {
    const s = site({});
    expect(evaluate(s, 200, "<div class=profile-header>")).toBe("found");
    expect(evaluate(s, 404, "Not found")).toBe("missing");
    expect(evaluate(s, 200, "a login wall")).toBe("unknown");
    expect(evaluate(s, 403, "blocked")).toBe("unknown");
  });

  it("removes excluded categories and POST-only sites, social first", () => {
    const selected = selectSites([
      site({ name: "Game", cat: "gaming" }),
      site({ name: "Adult", cat: "xx NSFW xx" }),
      site({ name: "Date", cat: "dating" }),
      site({ name: "Form", post_body: "{}" }),
      site({ name: "Social", cat: "social" }),
    ]);
    expect(selected.map((s) => s.name)).toEqual(["Social", "Game"]);
  });

  it("builds the profile address and strips forbidden characters", () => {
    expect(profileUrl("https://social.example/user/{account}", "j.dupont")).toBe("https://social.example/user/j.dupont");
    expect(prepareUsername(site({ strip_bad_char: "." }), "j.dupont")).toBe("jdupont");
  });
});
