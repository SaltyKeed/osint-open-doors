import { describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/xposedornot/breach-analytics.json";
import { toFindings, toPasteFindings } from "./mapper";
import { breachAnalyticsSchema } from "./schema";

describe("xposedornot mapper", () => {
  const parsed = breachAnalyticsSchema.parse(fixture);

  it("maps each breach to an exposure with domain categories", () => {
    const exposures = toFindings(parsed);
    expect(exposures).toHaveLength(2);
    expect(exposures[0]).toEqual({
      kind: "breach",
      providerId: "xposedornot",
      source: "ExampleShop",
      domain: "exampleshop.invalid",
      year: "2021",
      records: 12345,
      categories: ["email", "password", "name", "phone"],
      matchedOn: "email",
    });
  });

  it("maps unknown provider categories to 'other' without duplicates", () => {
    const [, forum] = toFindings(parsed);
    expect(forum?.categories).toEqual(["email", "username", "ipAddress", "other"]);
  });

  it("returns no exposure when the email is in no breach", () => {
    expect(toFindings(breachAnalyticsSchema.parse({ ExposedBreaches: null }))).toEqual([]);
  });

  it("counts the pastes without fetching their content", () => {
    expect(toPasteFindings(breachAnalyticsSchema.parse({ ExposedBreaches: null, PastesSummary: { cnt: 3 } }))).toEqual([
      expect.objectContaining({ kind: "account", service: "Pastes (textes publiés)", matchedOn: "email" }),
    ]);
    expect(toPasteFindings(parsed)).toEqual([]);
  });

  it("never copies fields outside the whitelist", () => {
    const keys = Object.keys(toFindings(parsed)[0] ?? {});
    expect(keys.sort()).toEqual(
      ["categories", "domain", "kind", "matchedOn", "providerId", "records", "source", "year"].sort(),
    );
  });
});
