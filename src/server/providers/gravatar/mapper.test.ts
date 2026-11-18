import { describe, expect, it } from "vitest";
import empty from "@/tests/fixtures/gravatar/empty.json";
import found from "@/tests/fixtures/gravatar/found.json";
import { toRecords } from "./mapper";
import { gravatarProfileSchema } from "./schema";

describe("toRecords", () => {
  it("keeps only the whitelisted fields of the profile", () => {
    // toStrictEqual fails if an extra field (description, pronouns, hidden account) gets through.
    expect(toRecords(gravatarProfileSchema.parse(found))).toStrictEqual([
      {
        about: "subject",
        fields: [
          { field: "A1", value: "Léa Martin" },
          { field: "A5", value: "https://0.gravatar.com/avatar/4b2f0c3e8d1a9f7e6c5b4a3928170615f4e3d2c1b0a99887766554433221100f" },
          { field: "C1", value: "Neuchâtel" },
          { field: "E1", value: "Apprentie informaticienne, Exemple SA" },
          { field: "F1", value: "lmartin06" },
          { field: "F2", value: "https://gravatar.com/lmartin06" },
          { field: "F2", value: "https://github.com/lmartin06" },
        ],
        identifiers: [
          { type: "PSEUDO", value: "lmartin06" },
          { type: "PROFIL", value: "https://github.com/lmartin06" },
        ],
      },
    ]);
  });

  it("leaves out empty values and hidden accounts", () => {
    expect(toRecords(gravatarProfileSchema.parse(empty))).toStrictEqual([
      {
        about: "subject",
        fields: [
          { field: "F1", value: "userx" },
          { field: "F2", value: "https://gravatar.com/userx" },
        ],
        identifiers: [{ type: "PSEUDO", value: "userx" }],
      },
    ]);
  });

  it.each([
    ["job title only", { job_title: "Apprentie", company: "" }, "Apprentie"],
    ["company only", { job_title: "", company: "Exemple SA" }, "Exemple SA"],
  ])("writes the job with the %s", (_label, job, expected) => {
    const [record] = toRecords(gravatarProfileSchema.parse({ ...empty, ...job }));
    expect(record?.fields).toContainEqual({ field: "E1", value: expected });
  });
});
