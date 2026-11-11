import { describe, expect, it } from "vitest";
import { buildActionPlan } from "./actions";
import type { Exposure } from "./types";

const exposure = (categories: Exposure["categories"]): Exposure => ({
  providerId: "test",
  source: "ExampleShop",
  categories,
  matchedOn: "email",
});

describe("buildActionPlan", () => {
  it("returns no action when nothing is exposed", () => {
    expect(buildActionPlan([])).toEqual([]);
  });

  it("puts the password action first when a password was exposed", () => {
    const plan = buildActionPlan([exposure(["email", "phone"]), exposure(["password"])]);
    expect(plan[0]?.id).toBe("change-passwords");
    expect(plan.map((a) => a.id)).toContain("phishing");
  });

  it("does not repeat an action for several exposures", () => {
    const plan = buildActionPlan([exposure(["password"]), exposure(["password"])]);
    expect(plan.filter((a) => a.id === "change-passwords")).toHaveLength(1);
  });
});
