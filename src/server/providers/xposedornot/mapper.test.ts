import { describe, expect, it } from "vitest";
import found from "@/tests/fixtures/xposedornot/found.json";
import notFound from "@/tests/fixtures/xposedornot/not-found.json";
import { toRecords } from "./mapper";
import { xonResponseSchema } from "./schema";

function breachRecord(value: string, breach: object) {
  return { about: "subject", fields: [{ field: "H1", value, breach }], identifiers: [] };
}

describe("toRecords", () => {
  it("returns one record per breach, with only the whitelisted fields", () => {
    // toStrictEqual fails if an extra field (details, password_risk, logo) gets through.
    expect(toRecords(xonResponseSchema.parse(found))).toStrictEqual([
      breachRecord("ExampleShop", {
        domain: "exampleshop.test",
        year: 2019,
        dataTypes: ["email", "password", "name", "username"],
        records: 120000,
        verified: true,
      }),
      breachRecord("ForumDemo", {
        domain: null,
        year: null,
        dataTypes: ["email", "other"],
        records: 800,
        verified: false,
      }),
    ]);
  });

  it("returns an empty list when nothing is found", () => {
    expect(toRecords(xonResponseSchema.parse(notFound))).toEqual([]);
  });
});
