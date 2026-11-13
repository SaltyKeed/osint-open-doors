import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// All values below are invented test data.
vi.mock("@/server/providers/registry", () => ({
  getProviders: () => [
    {
      id: "fake",
      supports: ["email"],
      search: async () => [],
      inspect: async () => ({
        raw: { list: [{ name: "ExampleShop", logo: "x.png" }] },
        parsed: { list: [{ name: "ExampleShop" }] },
        exposures: [],
      }),
    },
    {
      id: "phone-only",
      supports: ["phone"],
      search: async () => [],
      inspect: async () => ({ raw: null, parsed: null, exposures: [] }),
    },
  ],
}));

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/dev/search", { method: "POST", body: JSON.stringify(body) }));

const valid = { email: "jean@exemple.ch", consent: true, providers: ["fake", "phone-only"] };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/dev/search", () => {
  it.each(["production", "test"])("does not exist when NODE_ENV is %s", async (env) => {
    vi.stubEnv("NODE_ENV", env);
    expect((await post(valid)).status).toBe(404);
  });

  it("returns the raw response and the fields the schema dropped", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await post(valid);
    expect(response.status).toBe(200);
    const { reports } = await response.json();
    expect(reports[0]).toMatchObject({
      id: "fake",
      status: "ok",
      raw: { list: [{ name: "ExampleShop", logo: "x.png" }] },
      ignoredFields: ["list[].logo"],
    });
    expect(reports[1]).toMatchObject({ id: "phone-only", status: "skipped" });
  });

  it("returns 400 with field names only when no provider is chosen", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await post({ email: "jean@exemple.ch", consent: true, providers: [] });
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toContain("providers");
    expect(text).not.toContain("jean");
  });
});
