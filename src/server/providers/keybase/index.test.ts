import { describe, expect, it } from "vitest";
import { toKeybaseFinding } from "./index";

// Invented answer (fixtures never contain real data).
describe("keybase", () => {
  it("lists the services proved by the account", () => {
    const [finding] = toKeybaseFinding(
      {
        them: [
          {
            basics: { username: "jdupont" },
            proofs_summary: { all: [{ proof_type: "github", nametag: "jdupont" }, { proof_type: "reddit", nametag: "jd42" }] },
          },
        ],
      },
      "pseudo",
    );
    expect(finding?.summary).toContain("github, reddit");
    expect(finding?.handles).toEqual(["jdupont", "jd42"]);
  });

  it("returns nothing when the username does not exist", () => {
    expect(toKeybaseFinding({ them: [null] }, "pseudo")).toEqual([]);
  });
});
