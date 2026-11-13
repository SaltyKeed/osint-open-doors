import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// All values below are invented test data.
vi.mock("@/server/providers/registry", () => ({
  getProviders: () => [
    {
      id: "fake",
      supports: ["email"],
      search: async () => [
        {
          providerId: "fake",
          source: "ExampleShop",
          domain: null,
          year: 2019,
          categories: ["email"],
          recordCount: null,
          verified: true,
        },
      ],
    },
  ],
}));

const post = (body: string) =>
  POST(new Request("http://localhost/api/search", { method: "POST", body }));

describe("POST /api/search", () => {
  it("returns 400 on invalid JSON", async () => {
    const response = await post("{not json");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 400 without echoing the input when consent is missing", async () => {
    const response = await post(JSON.stringify({ email: "jean@exemple.ch" }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("jean");
  });

  it("returns 200 with exposures for a valid email", async () => {
    const response = await post(JSON.stringify({ email: "Jean@Exemple.ch", consent: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.exposures).toHaveLength(1);
    expect(body.failedProviders).toEqual([]);
  });

  it.each([
    ["an error", "{not json"],
    ["a result", JSON.stringify({ email: "jean@exemple.ch", consent: true })],
  ])("sets Cache-Control: no-store on %s", async (_label, body) => {
    expect((await post(body)).headers.get("Cache-Control")).toBe("no-store");
  });
});
