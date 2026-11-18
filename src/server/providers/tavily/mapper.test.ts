import { describe, expect, it } from "vitest";
import found from "@/tests/fixtures/tavily/found.json";
import { phoneFormats, toRecords } from "./mapper";
import { tavilyResponseSchema } from "./schema";

describe("toRecords", () => {
  it("keeps only the pages that really cite the identifier, with their address and title", () => {
    // The page text is used to check the citation, never kept: it may name other people.
    expect(toRecords(tavilyResponseSchema.parse(found), ["lea.martin@exemple.ch"])).toStrictEqual([
      {
        about: "subject",
        fields: [
          {
            field: "I1",
            value: "https://club.example/resultats-2026",
            page: { title: "Résultats course populaire 10 km - Club Exemple" },
          },
        ],
        identifiers: [],
      },
    ]);
  });

  it("finds a citation whatever its case", () => {
    const records = toRecords(tavilyResponseSchema.parse(found), ["LEA.MARTIN@EXEMPLE.CH"]);
    expect(records).toHaveLength(1);
  });
});

describe("phoneFormats", () => {
  it("writes a Swiss number in the three usual ways", () => {
    expect(phoneFormats("+41791234567")).toEqual(["+41791234567", "0791234567", "079 123 45 67"]);
  });

  it("keeps a foreign number as it is", () => {
    expect(phoneFormats("+33612345678")).toEqual(["+33612345678"]);
  });
});
