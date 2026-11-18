import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// All values below are invented test data.
vi.mock("@/server/providers/registry", () => ({
  SOURCES: [
    {
      id: "fake",
      accepts: ["EMAIL"],
      investigate: async () => [],
      inspect: async () => ({
        raw: { list: [{ name: "ExampleShop", logo: "x.png" }] },
        parsed: { list: [{ name: "ExampleShop" }] },
        records: [],
      }),
    },
    {
      id: "phone-only",
      accepts: ["TEL"],
      investigate: async () => [],
      inspect: async () => ({ raw: null, parsed: null, records: [] }),
    },
  ],
}));

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/dev/search", { method: "POST", body: JSON.stringify(body) }));

const valid = { email: "jean@exemple.ch", consent: true, sources: ["fake", "phone-only"] };

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
      input: "EMAIL",
      status: "ok",
      raw: { list: [{ name: "ExampleShop", logo: "x.png" }] },
      ignoredFields: ["list[].logo"],
    });
    expect(reports[1]).toMatchObject({ id: "phone-only", status: "skipped" });
  });

  it("gives each identifier to the sources that accept its type", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await post({ ...valid, phone: "079 123 45 67" });
    const { reports } = await response.json();
    expect(reports.map((r: { id: string; input: string }) => [r.id, r.input])).toEqual([
      ["fake", "EMAIL"],
      ["phone-only", "TEL"],
    ]);
  });

  it("returns 400 with field names only when no source is chosen", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await post({ email: "jean@exemple.ch", consent: true, sources: [] });
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toContain("sources");
    expect(text).not.toContain("jean");
  });
});
