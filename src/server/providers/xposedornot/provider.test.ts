import { afterEach, describe, expect, it, vi } from "vitest";
import found from "@/tests/fixtures/xposedornot/found.json";
import notFound from "@/tests/fixtures/xposedornot/not-found.json";
import { xposedOrNot } from "./index";

// All values below are invented test data.
const query = { email: "jean+test@exemple.ch" };

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("xposedOrNot provider", () => {
  it("returns exposures when found", async () => {
    stubFetch(200, found);
    expect(await xposedOrNot.search(query, new AbortController().signal)).toHaveLength(2);
  });

  it("returns [] when the body is all null", async () => {
    stubFetch(200, notFound);
    expect(await xposedOrNot.search(query, new AbortController().signal)).toEqual([]);
  });

  it("returns [] on 404", async () => {
    stubFetch(404, { Error: "Not found" });
    expect(await xposedOrNot.search(query, new AbortController().signal)).toEqual([]);
  });

  it.each([500, 429])("throws on HTTP %i without the email", async (status) => {
    stubFetch(status);
    const error = await xposedOrNot.search(query, new AbortController().signal).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(`xposedornot: HTTP ${status}`);
    expect((error as Error).message).not.toMatch(/jean|exemple/);
  });

  it("throws 'xposedornot: invalid response' on an unexpected shape", async () => {
    stubFetch(200, { ExposedBreaches: { breaches_details: "oops" } });
    await expect(xposedOrNot.search(query, new AbortController().signal)).rejects.toThrow(
      "xposedornot: invalid response",
    );
  });

  it("throws 'xposedornot: invalid response' on a body that is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>jean@exemple.ch</html>")));
    await expect(xposedOrNot.search(query, new AbortController().signal)).rejects.toThrow(
      /^xposedornot: invalid response$/,
    );
  });

  it("does not call fetch when the query has no email", async () => {
    const fetchMock = stubFetch(200, found);
    expect(await xposedOrNot.search({ phone: "+41791234567" }, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("encodes the email in the URL and passes the abort signal", async () => {
    const fetchMock = stubFetch(200, notFound);
    const signal = new AbortController().signal;
    await xposedOrNot.search(query, signal);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("email=jean%2Btest%40exemple.ch");
    expect(init.signal).toBe(signal);
  });
});
