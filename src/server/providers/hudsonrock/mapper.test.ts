import { describe, expect, it } from "vitest";
import found from "@/tests/fixtures/hudsonrock/found.json";
import notFound from "@/tests/fixtures/hudsonrock/not-found.json";
import { toRecords } from "./mapper";
import { hudsonRockResponseSchema } from "./schema";

describe("toRecords", () => {
  it("returns one record per infected computer, with the minimal summary only", () => {
    // toStrictEqual fails if computer name, IP, paths, logins or passwords get through.
    expect(toRecords(hudsonRockResponseSchema.parse(found))).toStrictEqual([
      {
        about: "subject",
        fields: [
          {
            field: "H5",
            value: "2026-03-14",
            infection: { date: "2026-03-14", operatingSystem: "Windows 11 Home", stolenCredentials: 87 },
          },
        ],
        identifiers: [],
      },
      {
        about: "subject",
        fields: [
          {
            field: "H5",
            value: "Date inconnue",
            infection: { date: null, operatingSystem: null, stolenCredentials: 12 },
          },
        ],
        identifiers: [],
      },
    ]);
  });

  it("returns [] when no infected computer is known", () => {
    expect(toRecords(hudsonRockResponseSchema.parse(notFound))).toEqual([]);
  });
});
