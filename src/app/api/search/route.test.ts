import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// All values below are invented test data.
vi.mock("@/server/providers/registry", () => ({
  SOURCES: [
    {
      id: "fake",
      accepts: ["EMAIL"],
      investigate: async () => [{ about: "subject", fields: [{ field: "H1", value: "ExampleShop" }], identifiers: [] }],
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

  it("streams one JSON event per line and ends with done", async () => {
    const response = await post(JSON.stringify({ email: "Jean@Exemple.ch", consent: true }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
    const lines = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(lines[0]).toMatchObject({ type: "finding", finding: { field: "H1", value: "ExampleShop", sources: ["fake"] } });
    expect(lines.at(-1)).toEqual({ type: "done", hidden: { possible: 0, namesake: 0 } });
  });

  it.each([
    ["an error", "{not json"],
    ["a result", JSON.stringify({ email: "jean@exemple.ch", consent: true })],
  ])("sets Cache-Control: no-store on %s", async (_label, body) => {
    expect((await post(body)).headers.get("Cache-Control")).toBe("no-store");
  });
});
