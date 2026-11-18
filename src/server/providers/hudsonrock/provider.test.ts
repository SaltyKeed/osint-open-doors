import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import { SourceQuotaError } from "@/server/domain/source";
import found from "@/tests/fixtures/hudsonrock/found.json";
import { hudsonRock } from "./index";

// All values below are invented test data.
const email: Identifier = { type: "EMAIL", value: "lea+test@exemple.ch" };
const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };
const BASE = "https://cavalier.hudsonrock.com/api/json/v2/osint-tools";

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hudsonRock source", () => {
  it("searches an email with the encoded address", async () => {
    const fetchMock = stubFetch(200, found);
    expect(await hudsonRock.investigate(email, new AbortController().signal)).toHaveLength(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/search-by-email?email=lea%2Btest%40exemple.ch`);
  });

  it("searches a pseudo with the username endpoint", async () => {
    const fetchMock = stubFetch(200, found);
    await hudsonRock.investigate(pseudo, new AbortController().signal);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/search-by-username?username=lmartin_06`);
  });

  it("inspect keeps the raw body and drops the sensitive fields from the parsed one", async () => {
    stubFetch(200, found);
    const { raw, parsed } = await hudsonRock.inspect(email, new AbortController().signal);
    expect(raw).toEqual(found);
    expect(JSON.stringify(parsed)).not.toMatch(/computer_name|top_passwords|top_logins|malware_path|"ip"/);
  });

  it("throws a quota error on 429", async () => {
    stubFetch(429);
    await expect(hudsonRock.investigate(email, new AbortController().signal)).rejects.toBeInstanceOf(SourceQuotaError);
  });

  it("throws 'hudsonrock: invalid response' on an unexpected shape", async () => {
    stubFetch(200, { stealers: "oops" });
    await expect(hudsonRock.investigate(email, new AbortController().signal)).rejects.toThrow(/^hudsonrock: invalid response$/);
  });

  it("does not call fetch for a type it does not accept", async () => {
    const fetchMock = stubFetch(200, found);
    const tel: Identifier = { type: "TEL", value: "+41791234567" };
    expect(await hudsonRock.investigate(tel, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
