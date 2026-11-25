import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import { isWmnHost, whatsMyName, WMN_HOSTS, WMN_SITES } from "./index";

// All values below are invented test data.
const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("whatsMyName source", () => {
  it("keeps 569 sites of the frozen list and declares them", () => {
    expect(WMN_SITES).toHaveLength(569);
    expect(whatsMyName.sitesChecked).toBe(569);
  });

  it("has its own call timeout, longer than the 8 seconds of the engine", () => {
    expect(whatsMyName.callTimeoutMs).toBe(25_000);
  });

  it("returns one record per account found, with its address only, and no identifier to search again", async () => {
    const first = WMN_SITES[0]!;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === first.uri_check.replace("{account}", "lmartin_06")
          ? new Response(`<html>${first.e_string}</html>`, { status: first.e_code })
          : new Response("", { status: 599 }),
      ),
    );
    const records = await whatsMyName.investigate(pseudo, new AbortController().signal);
    expect(records).toEqual([
      {
        about: "subject",
        fields: [{ field: "F2", value: (first.uri_pretty ?? first.uri_check).replace("{account}", "lmartin_06") }],
        identifiers: [],
      },
    ]);
  });

  describe("og tags of the page found (T10)", () => {
    const address = (first: (typeof WMN_SITES)[number]) => (first.uri_pretty ?? first.uri_check).replace("{account}", "lmartin_06");
    function stubFirstSite(tags: string) {
      const first = WMN_SITES[0]!;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) =>
          url === first.uri_check.replace("{account}", "lmartin_06")
            ? new Response(`<html>${first.e_string}${tags}</html>`, { status: first.e_code })
            : new Response("", { status: 599 }),
        ),
      );
      return first;
    }

    it("adds the displayed name and the photo to the address, and fills A1 and A5", async () => {
      const first = stubFirstSite(
        '<meta property="og:title" content="Léa Martin"><meta property="og:image" content="https://cdn.exemple.ch/p.jpg">',
      );
      const records = await whatsMyName.investigate(pseudo, new AbortController().signal);
      expect(records).toEqual([
        {
          about: "subject",
          fields: [
            { field: "F2", value: address(first), profile: { name: "Léa Martin", photo: "https://cdn.exemple.ch/p.jpg" } },
            { field: "A1", value: "Léa Martin" },
            { field: "A5", value: "https://cdn.exemple.ch/p.jpg" },
          ],
          identifiers: [],
        },
      ]);
    });

    it("keeps the name part of the page title, not the title", async () => {
      const first = stubFirstSite('<meta property="og:title" content="Léa Martin (@lmartin_06) • Instagram photos and videos">');
      const records = await whatsMyName.investigate(pseudo, new AbortController().signal);
      expect(records[0]?.fields).toEqual([
        { field: "F2", value: address(first), profile: { name: "Léa Martin" } },
        { field: "A1", value: "Léa Martin" },
      ]);
    });

    it("gives only the address, without profile, when the page has no tag", async () => {
      const first = stubFirstSite("");
      const records = await whatsMyName.investigate(pseudo, new AbortController().signal);
      expect(records[0]?.fields).toEqual([{ field: "F2", value: address(first) }]);
    });

    it("keeps the tags of a found account in the raw result of the dev console", async () => {
      stubFirstSite('<meta property="og:title" content="Léa Martin">');
      const inspection = await whatsMyName.inspect(pseudo, new AbortController().signal);
      expect(JSON.stringify(inspection.raw)).toContain("Léa Martin");
    });
  });

  describe("WMN_HOSTS", () => {
    it("holds the host of the sites of the list, in lowercase", () => {
      const first = WMN_SITES[0]!;
      expect(WMN_HOSTS.has(new URL(first.uri_check.replace("{account}", "x")).hostname)).toBe(true);
      for (const host of WMN_HOSTS) expect(host).toBe(host.toLowerCase());
    });

    it("does not hold a host outside the list", () => {
      for (const host of ["localhost", "192.168.1.1", "evil.exemple"]) expect(WMN_HOSTS.has(host)).toBe(false);
    });

    it("isWmnHost accepts one subdomain of a site that gives each account its own subdomain", () => {
      const subdomainSite = WMN_SITES.find((s) => s.uri_check.startsWith("https://{account}."));
      expect(subdomainSite).toBeDefined();
      const suffix = new URL(subdomainSite!.uri_check.replace("{account}", "x")).hostname.slice(1);
      expect(isWmnHost(`lmartin06${suffix}`)).toBe(true);
      expect(isWmnHost(`a.b${suffix}`)).toBe(false);
      expect(isWmnHost(`evil${suffix}.exemple`)).toBe(false);
      // A site that is really called x.something does not open all of its domain.
      expect(isWmnHost("lmartin06.com")).toBe(false);
    });
  });

  it("does not call fetch for a type it does not accept", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const email: Identifier = { type: "EMAIL", value: "lea@exemple.ch" };
    expect(await whatsMyName.investigate(email, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
