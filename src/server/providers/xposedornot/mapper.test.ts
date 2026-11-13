import { describe, expect, it } from "vitest";
import found from "@/tests/fixtures/xposedornot/found.json";
import notFound from "@/tests/fixtures/xposedornot/not-found.json";
import { toExposures } from "./mapper";
import { xonResponseSchema } from "./schema";

describe("toExposures", () => {
  it("keeps only the whitelisted fields", () => {
    // toStrictEqual fails if an extra field (details, password_risk, logo) gets through.
    expect(toExposures(xonResponseSchema.parse(found))).toStrictEqual([
      {
        providerId: "xposedornot",
        source: "ExampleShop",
        domain: "exampleshop.test",
        year: 2019,
        categories: ["email", "password", "name", "username"],
        recordCount: 120000,
        verified: true,
      },
      {
        providerId: "xposedornot",
        source: "ForumDemo",
        domain: null,
        year: null,
        categories: ["email", "other"],
        recordCount: 800,
        verified: false,
      },
    ]);
  });

  it("returns an empty list when nothing is found", () => {
    expect(toExposures(xonResponseSchema.parse(notFound))).toEqual([]);
  });
});
