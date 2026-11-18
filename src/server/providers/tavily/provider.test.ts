import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import found from "@/tests/fixtures/tavily/found.json";
import { tavily } from "./index";

// All values below are invented test data.
const email: Identifier = { type: "EMAIL", value: "lea.martin@exemple.ch" };
const tel: Identifier = { type: "TEL", value: "+41791234567" };

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
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

  it("allows at most 3 searches per investigation (quota of the open day)", () => {
    expect(tavily("tvly-exemple").maxCallsPerInvestigation).toBe(3);
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
