import { describe, expect, it } from "vitest";
import type { Source, SourceRecord } from "./source";

// All values below are invented test data.

const record: SourceRecord = {
  about: "subject",
  fields: [
    { field: "B2", value: "+41791234567" },
    { field: "H1", value: "ExampleShop", breach: { domain: "exampleshop.test", year: 2019, dataTypes: ["email"], records: 1200, verified: true } },
  ],
  identifiers: [{ type: "TEL", value: "+41791234567" }],
};

// If the port changes, this fake source stops compiling: that is the real test.
const fakeSource = {
  id: "fake",
  accepts: ["EMAIL"],
  investigate: async () => [record],
  inspect: async () => ({ raw: null, parsed: null, records: [record] }),
} satisfies Source;

describe("Source port", () => {
  it("returns the records of the source", async () => {
    const records = await fakeSource.investigate();
    expect(records).toEqual([record]);
  });
});
