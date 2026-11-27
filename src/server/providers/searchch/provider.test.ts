import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import { SourceQuotaError } from "@/server/domain/source";
import { entry, feed } from "@/tests/fixtures/searchch/feed";
import { searchCh } from "./index";

// All values below are invented test data.
const KEY = "cle-exemple-123";
const tel: Identifier = { type: "TEL", value: "+41791234567" };
const nom: Identifier = { type: "NOM", value: "Léa Martin" };

function stubFetch(status: number, body = feed(1, [entry()])) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function calledUrl(fetchMock: ReturnType<typeof stubFetch>) {
  return new URL((fetchMock.mock.calls[0] as [string])[0]);
}

const signal = () => new AbortController().signal;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchch source", () => {
  it("looks a phone number up, without the private and company filters", async () => {
    const fetchMock = stubFetch(200);
    const records = await searchCh(KEY).investigate(tel, signal());
    expect(records).toHaveLength(1);
    const url = calledUrl(fetchMock);
    expect(`${url.origin}${url.pathname}`).toBe("https://search.ch/tel/api/");
    expect(Object.fromEntries(url.searchParams)).toEqual({ was: "+41791234567", key: KEY, lang: "fr", maxnum: "3" });
  });

  it("looks a name up among private persons only", async () => {
    const fetchMock = stubFetch(200, feed(1, [entry()]));
    await searchCh(KEY).investigate(nom, signal());
    expect(Object.fromEntries(calledUrl(fetchMock).searchParams)).toEqual({
      was: "Léa Martin",
      key: KEY,
      lang: "fr",
      maxnum: "3",
      privat: "1",
      firma: "0",
    });
  });

  it("returns nothing and calls nothing for another type", async () => {
    const fetchMock = stubFetch(200);
    const email: Identifier = { type: "EMAIL", value: "lea.martin@exemple.ch" };
    expect(await searchCh(KEY).investigate(email, signal())).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("declares what it accepts and its two calls per investigation", () => {
    const source = searchCh(KEY);
    expect(source.id).toBe("searchch");
    expect(source.accepts).toEqual(["TEL", "NOM"]);
    expect(source.maxCallsPerInvestigation).toBe(4);
  });

  it("returns nothing on a 404", async () => {
    stubFetch(404, "");
    expect(await searchCh(KEY).investigate(tel, signal())).toEqual([]);
  });

  it("fails on a 403 without the key nor the number in the message", async () => {
    stubFetch(403, "");
    const error = await searchCh(KEY)
      .investigate(tel, signal())
      .then(
        () => undefined,
        (e: Error) => e,
      );
    expect(error?.message).toBe("searchch: HTTP 403");
    expect(error?.message).not.toContain(KEY);
    expect(error?.message).not.toContain("791234567");
  });

  it("raises a quota error on a 429", async () => {
    stubFetch(429, "");
    await expect(searchCh(KEY).investigate(tel, signal())).rejects.toBeInstanceOf(SourceQuotaError);
  });

  it("fails with a fixed message on an answer that is not an Atom feed", async () => {
    stubFetch(200, "<html>Léa Martin</html>");
    await expect(searchCh(KEY).investigate(nom, signal())).rejects.toThrow(/^searchch: invalid response$/);
  });

  it("shows the raw answer, the parsed one and the records to the dev console", async () => {
    const body = feed(1, [entry()]);
    stubFetch(200, body);
    const inspection = await searchCh(KEY).inspect(tel, signal());
    expect(inspection.raw).toBe(body);
    expect(inspection.parsed).toMatchObject({ total: 1 });
    expect(inspection.records).toHaveLength(1);
  });
});
