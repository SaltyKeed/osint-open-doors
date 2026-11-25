import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// All values below are invented test data.
const { investigateFake } = vi.hoisted(() => ({
  investigateFake: vi.fn(async () => [
    { about: "subject", fields: [{ field: "H1", value: "ExampleShop" }], identifiers: [] },
  ]),
}));
vi.mock("@/server/providers/registry", () => ({
  SOURCES: [{ id: "fake", accepts: ["EMAIL"], investigate: investigateFake }],
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

  it.each<[string, unknown]>([
    ["too many confirmed profiles", { confirmedProfiles: Array(61).fill("https://exemple.ch/a") }],
    ["too many identifiers already searched", { searched: Array(301).fill({ type: "EMAIL", value: "a@exemple.ch" }) }],
    ["a profile that is not http or https", { confirmedProfiles: ["javascript:secret_visitor_value"] }],
    ["an invalid identifier already searched", { searched: [{ type: "TEL", value: "secret_visitor_value" }] }],
  ])("returns 400 without echoing the input for %s", async (_label, followUp) => {
    const response = await post(JSON.stringify({ email: "jean@exemple.ch", consent: true, ...(followUp as object) }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("secret_visitor_value");
  });

  it("does not give the sources an identifier already searched in the first round", async () => {
    investigateFake.mockClear();
    const body = { email: "jean@exemple.ch", consent: true, searched: [{ type: "EMAIL", value: "Jean@Exemple.ch" }] };
    const response = await post(JSON.stringify(body));
    const lines = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(investigateFake).not.toHaveBeenCalled();
    expect(lines).toEqual([{ type: "done", hidden: { possible: 0, namesake: 0 } }]);
  });

  it.each([
    ["an error", "{not json"],
    ["a result", JSON.stringify({ email: "jean@exemple.ch", consent: true })],
  ])("sets Cache-Control: no-store on %s", async (_label, body) => {
    expect((await post(body)).headers.get("Cache-Control")).toBe("no-store");
  });
});
