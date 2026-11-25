import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSite, profileUrl, usableSites } from "./check";
import type { WmnSite } from "./schema";

// All values below are invented test data.

const site: WmnSite = {
  name: "ForumExemple",
  uri_check: "https://forum.example/api/users/{account}",
  uri_pretty: "https://forum.example/u/{account}",
  e_code: 200,
  e_string: '"username":',
  m_code: 404,
  m_string: "not found",
  cat: "social",
};

function stub(status: number, body: string) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usableSites", () => {
  it("leaves out adult sites, protected sites and sites that need a POST", () => {
    const sites: WmnSite[] = [
      site,
      { ...site, name: "Adulte", cat: "xx NSFW xx" },
      { ...site, name: "Protege", protection: ["cloudflare"] },
      { ...site, name: "Post", post_body: "{}" },
      { ...site, name: "Invalide", valid: false },
    ];
    expect(usableSites(sites).map((s) => s.name)).toEqual(["ForumExemple"]);
  });
});

describe("profileUrl", () => {
  it("puts the encoded pseudo in the pretty address when there is one", () => {
    expect(profileUrl(site, "léa martin")).toBe("https://forum.example/u/l%C3%A9a%20martin");
  });

  it("removes the characters the site does not allow", () => {
    expect(profileUrl({ ...site, uri_pretty: undefined, strip_bad_char: "." }, "lea.martin")).toBe(
      "https://forum.example/api/users/leamartin",
    );
  });
});

describe("checkSite", () => {
  const signal = new AbortController().signal;

  it("finds an account when the code and the text both match", async () => {
    stub(200, '{"username": "lmartin_06"}');
    expect((await checkSite(site, "lmartin_06", signal)).result).toBe("found");
  });

  it("resolves a relative photo against the address it checked", async () => {
    stub(200, '{"username": "lmartin_06"} <meta property="og:image" content="/a.jpg">');
    expect((await checkSite(site, "lmartin_06", signal)).og).toEqual({ image: "https://forum.example/a.jpg" });
  });

  it("reads the og tags of a page found, and only then (T10)", async () => {
    const tags = '<meta property="og:title" content="Léa Martin">';
    stub(200, `{"username": "lmartin_06"} ${tags}`);
    expect(await checkSite(site, "lmartin_06", signal)).toEqual({ result: "found", og: { title: "Léa Martin" } });
    stub(404, `User not found ${tags}`);
    expect(await checkSite(site, "lmartin_06", signal)).toEqual({ result: "missing", og: {} });
  });

  it("reads the author name when the site is checked through an oEmbed answer (TikTok)", async () => {
    stub(200, JSON.stringify({ username: "lmartin_06", author_name: "Léa Martin" }));
    expect(await checkSite(site, "lmartin_06", signal)).toEqual({ result: "found", og: { title: "Léa Martin" } });
  });

  it("says missing when the missing code and text match", async () => {
    stub(404, "User not found");
    expect((await checkSite(site, "lmartin_06", signal)).result).toBe("missing");
  });

  it("says unknown when only the code matches", async () => {
    stub(200, "<html>page de connexion</html>");
    expect((await checkSite(site, "lmartin_06", signal)).result).toBe("unknown");
  });

  it("says unknown on a network error, never found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect((await checkSite(site, "lmartin_06", signal)).result).toBe("unknown");
  });

  it("does not follow redirects and sends the headers of the site", async () => {
    const fetchMock = stub(404, "not found");
    await checkSite({ ...site, headers: { Accept: "application/json" } }, "lmartin_06", signal);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://forum.example/api/users/lmartin_06");
    expect(init.redirect).toBe("manual");
    expect((init.headers as Record<string, string>).Accept).toBe("application/json");
  });
});
