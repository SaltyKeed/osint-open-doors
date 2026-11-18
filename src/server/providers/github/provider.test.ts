import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import commits from "@/tests/fixtures/github/commits.json";
import user from "@/tests/fixtures/github/user.json";
import { github } from "./index";

// All values below are invented test data.
const email: Identifier = { type: "EMAIL", value: "lea.martin@exemple.ch" };
const pseudo: Identifier = { type: "PSEUDO", value: "lmartin06" };

function stubGithub() {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("/search/commits")) return new Response(JSON.stringify(commits));
    if (url.endsWith("/users/lmartin06")) return new Response(JSON.stringify(user));
    return new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("github source", () => {
  it("searches the commits of an email, then reads each linked account once", async () => {
    const fetchMock = stubGithub();
    const records = await github().investigate(email, new AbortController().signal);
    expect(records).toHaveLength(2);
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      "https://api.github.com/search/commits?q=author-email%3Alea.martin%40exemple.ch&per_page=30",
      "https://api.github.com/users/lmartin06",
    ]);
  });

  it("reads the account of a pseudo directly", async () => {
    const fetchMock = stubGithub();
    expect(await github().investigate(pseudo, new AbortController().signal)).toHaveLength(1);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["https://api.github.com/users/lmartin06"]);
  });

  it("returns [] for a pseudo without account", async () => {
    stubGithub();
    const unknown: Identifier = { type: "PSEUDO", value: "personne_ici" };
    expect(await github().investigate(unknown, new AbortController().signal)).toEqual([]);
  });

  it("sends the token only when one is configured", async () => {
    const fetchMock = stubGithub();
    await github("github_pat_exemple").investigate(pseudo, new AbortController().signal);
    await github().investigate(pseudo, new AbortController().signal);
    const headers = fetchMock.mock.calls.map((call) => (call as unknown as [string, RequestInit])[1].headers as Record<string, string>);
    expect(headers[0]?.Authorization).toBe("Bearer github_pat_exemple");
    expect(headers[1]?.Authorization).toBeUndefined();
  });

  it("does not call fetch for a type it does not accept", async () => {
    const fetchMock = stubGithub();
    const tel: Identifier = { type: "TEL", value: "+41791234567" };
    expect(await github().investigate(tel, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws 'github: invalid response' on an unexpected shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: "oops" }))));
    await expect(github().investigate(email, new AbortController().signal)).rejects.toThrow(/^github: invalid response$/);
  });
});
