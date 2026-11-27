import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceQuotaError } from "@/server/domain/source";
import { fetchJson, fetchText } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stub(status: number, headers: Record<string, string> = {}) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status, headers })));
}

describe("fetchJson", () => {
  it("treats a 403 with no request left as a quota error (GitHub)", async () => {
    stub(403, { "x-ratelimit-remaining": "0" });
    await expect(fetchJson("x", "https://api.example/a", new AbortController().signal)).rejects.toBeInstanceOf(SourceQuotaError);
  });

  it.each([432, 433])("treats HTTP %i as a quota error (Tavily plan limits)", async (status) => {
    stub(status);
    await expect(fetchJson("x", "https://api.example/a", new AbortController().signal)).rejects.toBeInstanceOf(SourceQuotaError);
  });

  it("sends a POST with a JSON body when asked", async () => {
    stub(200);
    await fetchJson("x", "https://api.example/a", new AbortController().signal, {}, { query: "q" });
    const init = (vi.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"query":"q"}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("treats any other 403 as an ordinary error", async () => {
    stub(403);
    await expect(fetchJson("x", "https://api.example/a", new AbortController().signal)).rejects.toThrow(/^x: HTTP 403$/);
  });
});

describe("fetchText", () => {
  const signal = () => new AbortController().signal;

  it("returns the body as text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<feed/>", { status: 200 })));
    expect(await fetchText("x", "https://api.example/a", signal())).toBe("<feed/>");
  });

  it("sends the headers it is given", async () => {
    stub(200);
    await fetchText("x", "https://api.example/a", signal(), { Accept: "application/atom+xml" });
    const init = (vi.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toEqual({ Accept: "application/atom+xml" });
  });

  it("returns null on a 404", async () => {
    stub(404);
    expect(await fetchText("x", "https://api.example/a", signal())).toBeNull();
  });

  it("raises a quota error on a 429", async () => {
    stub(429);
    await expect(fetchText("x", "https://api.example/a", signal())).rejects.toBeInstanceOf(SourceQuotaError);
  });

  it("fails with a fixed message that holds neither the address nor the body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("corps secret", { status: 403 })));
    await expect(fetchText("x", "https://api.example/a?key=secret", signal())).rejects.toThrow(/^x: HTTP 403$/);
  });
});
