import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import type { DorkContext } from "@/server/domain/source";
import dorkFound from "@/tests/fixtures/tavily/dork-found.json";
import found from "@/tests/fixtures/tavily/found.json";
import { ROMANDIE } from "./dorks";
import { tavily } from "./index";

// All values below are invented test data.
const email: Identifier = { type: "EMAIL", value: "lea.martin@exemple.ch" };
const tel: Identifier = { type: "TEL", value: "+41791234567" };

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sent(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, body: JSON.parse(init.body as string) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tavily source", () => {
  it("searches the exact email, 1 credit, without generated answer nor page content", async () => {
    const fetchMock = stubFetch(200, found);
    expect(await tavily("tvly-exemple").investigate(email, new AbortController().signal)).toHaveLength(1);
    const { url, init, body } = sent(fetchMock);
    expect(url).toBe("https://api.tavily.com/search");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tvly-exemple");
    expect(body).toEqual({
      query: '"lea.martin@exemple.ch"',
      search_depth: "basic",
      max_results: 10,
      exact_match: true,
      include_answer: false,
      include_raw_content: false,
    });
  });

  it("searches every usual way of writing a phone number", async () => {
    const fetchMock = stubFetch(200, { results: [] });
    await tavily("tvly-exemple").investigate(tel, new AbortController().signal);
    expect(sent(fetchMock).body.query).toBe('"+41791234567" OR "0791234567" OR "079 123 45 67"');
  });

  it("allows at most 6 searches per investigation (quota of the open day)", () => {
    expect(tavily("tvly-exemple").maxCallsPerInvestigation).toBe(8);
  });

  it("throws 'tavily: invalid response' on an unexpected shape", async () => {
    stubFetch(200, { results: "oops" });
    await expect(tavily("tvly-exemple").investigate(email, new AbortController().signal)).rejects.toThrow(/^tavily: invalid response$/);
  });

  it("does not call fetch for a type it does not accept", async () => {
    const fetchMock = stubFetch(200, found);
    const pseudo: Identifier = { type: "PSEUDO", value: "lmartin06" };
    expect(await tavily("tvly-exemple").investigate(pseudo, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("tavily dorks", () => {
  const signal = new AbortController().signal;
  const bodies = (fetchMock: ReturnType<typeof stubFetch>) =>
    fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
  const byName: DorkContext = { name: "Léa Martin", values: { C1: ["Neuchâtel"] }, onlyValues: false };

  it("sends the country, the cantons for a dork without place, and the press domains", async () => {
    const fetchMock = stubFetch(200, { results: [] });
    await tavily("tvly-exemple").dork!(byName, 4, signal);
    const sentBodies = bodies(fetchMock);
    expect(sentBodies.every((b) => b.country === "switzerland")).toBe(true);
    expect(sentBodies[0].query).toBe('"Léa Martin" "Neuchâtel"');
    expect(sentBodies[1].query).toBe(`"Léa Martin" site:linkedin.com/in ${ROMANDIE}`);
    expect(sentBodies[3].include_domains).toContain("rts.ch");
    expect(sentBodies[2].include_domains).toBeUndefined();
  });

  it("stops at maxCalls, in the order of the list", async () => {
    const fetchMock = stubFetch(200, { results: [] });
    const result = await tavily("tvly-exemple").dork!(byName, 3, signal);
    expect(result.calls).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(bodies(fetchMock).map((b) => b.query)[2]).toContain("club OR");
  });

  it("retries a dork with cantons once without them, after the first sends; never a value dork", async () => {
    const fetchMock = stubFetch(200, { results: [] });
    const result = await tavily("tvly-exemple").dork!(byName, 20, signal);
    const queries = bodies(fetchMock).map((b) => b.query as string);
    // 1 value dork + 4 keyword dorks, then the 4 retries.
    expect(result.calls).toBe(9);
    expect(queries.slice(5).every((q) => !q.includes(ROMANDIE))).toBe(true);
    expect(queries.slice(5)[0]).toBe('"Léa Martin" site:linkedin.com/in');
    expect(queries.filter((q) => q === '"Léa Martin" "Neuchâtel"')).toHaveLength(1);
  });

  it("does not retry a dork that kept a page, and only keeps the address and the title", async () => {
    const fetchMock = stubFetch(200, dorkFound);
    const result = await tavily("tvly-exemple").dork!({ name: "Léa Martin", values: { C1: ["Neuchâtel"] }, onlyValues: true }, 6, signal);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.records).toEqual([
      {
        about: "subject",
        dork: "value",
        fields: [{ field: "I1", value: "https://club.example/membres/lea-martin", page: { title: "Léa Martin - Neuchâtel" } }],
        identifiers: [],
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("Membre du club");
  });

  it("keeps the pages found before a quota answer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(dorkFound), { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 432 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await tavily("tvly-exemple").dork!(byName, 6, signal);
    expect(result).toMatchObject({ calls: 2, failed: "quota" });
    expect(result.records).toHaveLength(1);
  });

  it("reports an error on a server error or an invalid response", async () => {
    stubFetch(500);
    expect(await tavily("tvly-exemple").dork!(byName, 6, signal)).toEqual({ calls: 1, records: [], failed: "error" });
    stubFetch(200, { results: "oops" });
    expect(await tavily("tvly-exemple").dork!(byName, 6, signal)).toMatchObject({ calls: 1, failed: "error" });
  });
});
