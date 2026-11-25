import { lookup } from "node:dns/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import { WMN_SITES } from "../whatsmyname";
import { profilePage } from "./index";

// All values below are invented test data.

// No real DNS query in a test: every name resolves to a public address unless a test says otherwise.
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const PUBLIC = [{ address: "93.184.216.34", family: 4 }];

const host = new URL(WMN_SITES[0]!.uri_check.replace("{account}", "x")).hostname;
const address = `https://${host}/lmartin_06`;
const profil: Identifier = { type: "PROFIL", value: address };
const signal = new AbortController().signal;
const tags = '<meta property="og:title" content="Léa Martin">';

function stub(status: number, body: string) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const redirect = (status: number, location: string) => new Response(null, { status, headers: { Location: location } });
const page = (html: string) => new Response(html, { status: 200 });

beforeEach(() => {
  vi.mocked(lookup).mockResolvedValue(PUBLIC as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(lookup).mockReset();
});

describe("profilePage source", () => {
  it("accepts only PROFIL", () => {
    expect(profilePage.id).toBe("profile-page");
    expect(profilePage.accepts).toEqual(["PROFIL"]);
  });

  it.each([
    "http://localhost/x",
    "http://192.168.1.1/x",
    "https://evil.exemple/x",
    `https://${host}:8080/x`,
    `https://user:pw@${host}/x`,
    "ftp://" + host + "/x",
    "pas une adresse",
  ])("never opens %s: its host is not in the list of WhatsMyName", async (value) => {
    const fetchMock = stub(200, tags);
    expect(await profilePage.investigate({ type: "PROFIL", value }, signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call fetch for another type of identifier", async () => {
    const fetchMock = stub(200, "");
    expect(await profilePage.investigate({ type: "EMAIL", value: "lea@exemple.ch" }, signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the name and photo, and gives the links and emails of the bio in a record of their own", async () => {
    stub(
      200,
      `<meta property="og:title" content="Léa Martin (@lmartin_06) • Instagram">
       <meta property="og:image" content="https://cdn.exemple.ch/p.jpg">
       <meta property="og:description" content="Mon site : https://lea-martin.exemple.ch, contact lea@exemple.ch">`,
    );
    expect(await profilePage.investigate(profil, signal)).toEqual([
      {
        about: "subject",
        fields: [
          { field: "A1", value: "Léa Martin" },
          { field: "A5", value: "https://cdn.exemple.ch/p.jpg" },
        ],
        identifiers: [],
      },
      {
        about: "subject",
        mentioned: true,
        fields: [],
        identifiers: [
          { type: "PROFIL", value: "https://lea-martin.exemple.ch" },
          { type: "EMAIL", value: "lea@exemple.ch" },
        ],
      },
    ]);
  });

  it("resolves a relative photo against the page address", async () => {
    stub(200, `${tags}<meta property="og:image" content="/img/p.jpg">`);
    const [record] = await profilePage.investigate(profil, signal);
    expect(record?.fields).toContainEqual({ field: "A5", value: `https://${host}/img/p.jpg` });
  });

  it("does not return the address of the profile itself, found in its own bio", async () => {
    stub(200, `${tags}<meta property="og:description" content="Ma page : ${address}/.">`);
    expect(await profilePage.investigate(profil, signal)).toEqual([
      { about: "subject", fields: [{ field: "A1", value: "Léa Martin" }], identifiers: [] },
    ]);
  });

  it("asks for a redirect without following it by itself, and sends no cookie", async () => {
    const fetchMock = stub(200, tags);
    await profilePage.investigate(profil, signal);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(address);
    expect(init.redirect).toBe("manual");
    expect(init.cache).toBe("no-store");
    expect((init.headers as Record<string, string>)["User-Agent"]).toContain("Mozilla/5.0");
  });

  it.each([404, 500])("gives nothing on a %i, without error", async (status) => {
    stub(status, tags);
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
  });

  it("gives nothing, without error, when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
  });

  it("gives nothing for a page without tag", async () => {
    stub(200, "<html><body>Bonjour</body></html>");
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
  });

  it("shows the tags read in the dev console", async () => {
    stub(200, tags);
    const inspection = await profilePage.inspect(profil, signal);
    expect(inspection.raw).toEqual({ title: "Léa Martin" });
    expect(inspection.parsed).toEqual({ title: "Léa Martin" });
  });

  it("reads at most 512 KB of the page", async () => {
    // The tag is after the limit: it is never seen.
    stub(200, `${" ".repeat(600 * 1024)}${tags}`);
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
  });
});

describe("profilePage DNS check", () => {
  it.each([
    ["a private address", [{ address: "10.0.0.5", family: 4 }]],
    ["a loopback address", [{ address: "127.0.0.1", family: 4 }]],
    ["a link-local address", [{ address: "169.254.169.254", family: 4 }]],
    ["a unique-local IPv6 address", [{ address: "fd00::1", family: 6 }]],
    ["one private address among public ones", [...PUBLIC, { address: "192.168.1.10", family: 4 }]],
    ["nothing", []],
  ])("never fetches a host that resolves to %s", async (_label, addresses) => {
    vi.mocked(lookup).mockResolvedValue(addresses as never);
    const fetchMock = stub(200, tags);
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives nothing when the name does not resolve", async () => {
    vi.mocked(lookup).mockRejectedValue(new Error("ENOTFOUND"));
    const fetchMock = stub(200, "");
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks for every address of the host", async () => {
    stub(200, tags);
    await profilePage.investigate(profil, signal);
    expect(lookup).toHaveBeenCalledWith(host, { all: true });
  });

  it("refuses a host written as an IP address, without a DNS query", async () => {
    const fetchMock = stub(200, "");
    expect(await profilePage.investigate({ type: "PROFIL", value: "http://93.184.216.34/x" }, signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("keeps http allowed", async () => {
    const fetchMock = stub(200, tags);
    await profilePage.investigate({ type: "PROFIL", value: `http://${host}/lmartin_06` }, signal);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("profilePage redirects", () => {
  it("follows a redirect to the same host with a trailing slash", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect(301, `${address}/`)).mockResolvedValueOnce(page(tags));
    vi.stubGlobal("fetch", fetchMock);
    expect(await profilePage.investigate(profil, signal)).toHaveLength(1);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([address, `${address}/`]);
  });

  it("resolves a relative Location against the current address", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect(302, "/u/lmartin_06")).mockResolvedValueOnce(page(tags));
    vi.stubGlobal("fetch", fetchMock);
    await profilePage.investigate(profil, signal);
    expect(fetchMock.mock.calls[1]![0]).toBe(`https://${host}/u/lmartin_06`);
  });

  it.each(["http://localhost/", "http://192.168.1.1/", "https://evil.exemple/x", `https://${host}:8080/x`, "ftp://" + host + "/x"])(
    "does not follow a redirect to %s",
    async (location) => {
      const fetchMock = vi.fn().mockResolvedValue(redirect(301, location));
      vi.stubGlobal("fetch", fetchMock);
      expect(await profilePage.investigate(profil, signal)).toEqual([]);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls.map((c) => c[0])).not.toContain(location);
    },
  );

  it("does not follow a redirect to a listed host that resolves to a private address", async () => {
    vi.mocked(lookup)
      .mockResolvedValueOnce(PUBLIC as never)
      .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }] as never);
    const fetchMock = vi.fn().mockResolvedValue(redirect(301, `https://${host}/autre`));
    vi.stubGlobal("fetch", fetchMock);
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("gives nothing for a redirect without Location", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 301 })));
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
  });

  it("follows 3 redirects and gives nothing at the 4th", async () => {
    const three = vi
      .fn()
      .mockResolvedValueOnce(redirect(301, `${address}/1`))
      .mockResolvedValueOnce(redirect(301, `${address}/2`))
      .mockResolvedValueOnce(redirect(301, `${address}/3`))
      .mockResolvedValueOnce(page(tags));
    vi.stubGlobal("fetch", three);
    expect(await profilePage.investigate(profil, signal)).toHaveLength(1);

    const four = vi.fn().mockImplementation(async () => redirect(301, `${address}/again`));
    vi.stubGlobal("fetch", four);
    expect(await profilePage.investigate(profil, signal)).toEqual([]);
    expect(four).toHaveBeenCalledTimes(4);
  });
});
