import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceQuotaError } from "@/server/domain/source";
import { fetchJson } from "./http";

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
