import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import { SourceQuotaError } from "@/server/domain/source";
import found from "@/tests/fixtures/gravatar/found.json";
import { gravatar } from "./index";

// All values below are invented test data.
const email: Identifier = { type: "EMAIL", value: "lea.martin@exemple.ch" };

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gravatar source", () => {
  it("asks for the SHA-256 of the email, never the email itself", async () => {
    const fetchMock = stubFetch(200, found);
    await gravatar.investigate(email, new AbortController().signal);
    const [url] = fetchMock.mock.calls[0] as [string];
    const hash = createHash("sha256").update("lea.martin@exemple.ch").digest("hex");
    expect(url).toBe(`https://api.gravatar.com/v3/profiles/${hash}`);
    expect(url).not.toContain("exemple");
  });

  it("returns one record when a profile exists", async () => {
    stubFetch(200, found);
    expect(await gravatar.investigate(email, new AbortController().signal)).toHaveLength(1);
  });

  it("inspect returns the raw body and the parsed body without extra fields", async () => {
    stubFetch(200, found);
    const { raw, parsed } = await gravatar.inspect(email, new AbortController().signal);
    expect(raw).toEqual(found);
    expect(JSON.stringify(parsed)).not.toContain("pronouns");
  });

  it("returns [] on 404 (no profile)", async () => {
    stubFetch(404, { error: "Profile not found" });
    expect(await gravatar.investigate(email, new AbortController().signal)).toEqual([]);
  });

  it("throws a quota error on 429", async () => {
    stubFetch(429);
    await expect(gravatar.investigate(email, new AbortController().signal)).rejects.toBeInstanceOf(SourceQuotaError);
  });

  it("throws 'gravatar: invalid response' on an unexpected shape", async () => {
    stubFetch(200, { display_name: 42 });
    await expect(gravatar.investigate(email, new AbortController().signal)).rejects.toThrow(/^gravatar: invalid response$/);
  });

  it("does not call fetch for an identifier that is not an email", async () => {
    const fetchMock = stubFetch(200, found);
    const pseudo: Identifier = { type: "PSEUDO", value: "lmartin06" };
    expect(await gravatar.investigate(pseudo, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
