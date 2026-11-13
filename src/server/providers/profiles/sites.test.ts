import { describe, expect, it } from "vitest";
import { PROFILE_SITES, parseBody, yearOf } from "./sites";

// Invented answers (fixtures never contain real data).
const site = (name: string) => {
  const found = PROFILE_SITES.find((s) => s.site === name);
  if (!found) throw new Error(`unknown site ${name}`);
  return found;
};

describe("yearOf", () => {
  it("reads ISO dates, English dates and timestamps", () => {
    expect(yearOf("2023-05-07T13:46:15.921Z")).toBe("2023");
    expect(yearOf("May 12, 2020")).toBe("2020");
    expect(yearOf(1192779774, "s")).toBe("2007");
    expect(yearOf(1326595486000)).toBe("2012");
    expect(yearOf("")).toBeUndefined();
    expect(yearOf("pas une date")).toBeUndefined();
  });
});

describe("profile sites", () => {
  it("keeps only facts from a Chess.com profile, never the name or the city", () => {
    const facts = site("Chess.com").read(
      {
        url: "https://www.chess.com/member/JDupont",
        name: "Jean Dupont",
        location: "Neuchâtel",
        joined: 1561939200,
        last_online: 1700000000,
        country: "https://api.chess.com/pub/country/CH",
      },
      "jdupont",
    );
    expect(facts).toEqual({
      url: "https://www.chess.com/member/JDupont",
      details: ["Compte créé en 2019", "Pays indiqué : CH", "Dernière connexion en 2023"],
    });
    expect(JSON.stringify(facts)).not.toMatch(/Dupont,|Jean|Neuchâtel/);
  });

  it("ignores the unknown country of Chess.com", () => {
    const facts = site("Chess.com").read({ url: "u", country: "https://api.chess.com/pub/country/XX" }, "x");
    expect(facts?.details).toEqual([]);
  });

  it("skips a closed Lichess account", () => {
    expect(site("Lichess").read({ url: "u", closed: true }, "x")).toBeNull();
    expect(site("Lichess").read({ url: "u", createdAt: 1326595486000, count: { all: 12 } }, "x")?.details).toEqual([
      "Compte créé en 2012",
      "12 parties jouées",
    ]);
    expect(site("Lichess").read({ url: "u", count: { all: 1 } }, "x")?.details).toEqual(["1 partie jouée"]);
  });

  it("reads the Steam XML profile and its error answer", () => {
    const ok = parseBody(
      "<?xml version=\"1.0\"?><profile><steamID64>76561190000000000</steamID64><steamID><![CDATA[Jean]]></steamID><memberSince>October 3, 2009</memberSince><privacyState>public</privacyState></profile>",
      "xml",
    );
    expect(site("Steam").read(ok, "jdupont")).toEqual({
      url: "https://steamcommunity.com/id/jdupont",
      details: ["Compte créé en 2009", "Profil public"],
    });
    const missing = parseBody("<?xml version=\"1.0\"?><response><error>not found</error></response>", "xml");
    expect(site("Steam").read(missing, "jdupont")).toBeNull();
  });

  it("treats the empty answers as no account", () => {
    expect(site("Hacker News").read(null, "x")).toBeNull();
    expect(site("Speedrun.com").read({ data: [] }, "x")).toBeNull();
    expect(site("Bluesky").read({ error: "InvalidRequest" }, "x")).toBeNull();
  });

  it("says which other accounts a Speedrun.com profile links, without their address", () => {
    const facts = site("Speedrun.com").read(
      {
        data: [
          {
            weblink: "https://www.speedrun.com/users/jdupont",
            signup: "2018-09-23T14:01:07Z",
            location: { country: { code: "ch" } },
            twitch: { uri: "https://www.twitch.tv/jdupont" },
            youtube: null,
          },
        ],
      },
      "jdupont",
    );
    expect(facts?.details).toEqual(["Compte créé en 2018", "Pays indiqué : CH", "Relié à : Twitch"]);
  });
});
