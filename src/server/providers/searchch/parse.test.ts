import { describe, expect, it } from "vitest";
import { entry, feed } from "@/tests/fixtures/searchch/feed";
import { parseFeed } from "./parse";

// All values below are invented test data.

describe("parseFeed", () => {
  it("reads the total and the entries", () => {
    const xml = feed(7, [
      entry(),
      entry({ type: "Organisation", name: "Exemple SA", firstname: "", street: "Rue du Port", streetno: "", zip: "2001" }),
    ]);
    expect(parseFeed(xml)).toEqual({
      total: 7,
      entries: [
        {
          type: "Person",
          name: "Martin",
          firstname: "Léa",
          street: "Rue du Lac",
          streetno: "1",
          zip: "2000",
          city: "Neuchâtel",
          phone: "+41791234567",
        },
        { type: "Organisation", name: "Exemple SA", street: "Rue du Port", zip: "2001", city: "Neuchâtel", phone: "+41791234567" },
      ],
    });
  });

  it("decodes named and numeric entities", () => {
    const xml = feed(1, [entry({ street: "Rue du Lac &amp; Port", city: "Neuch&#226;tel" })]);
    expect(parseFeed(xml).entries[0]).toMatchObject({ street: "Rue du Lac & Port", city: "Neuchâtel" });
  });

  it("does not decode what is inside a CDATA section", () => {
    const xml = feed(1, [entry({ street: "<![CDATA[Rue &amp; Co]]>" })]);
    expect(parseFeed(xml).entries[0]?.street).toBe("Rue &amp; Co");
  });

  it("gives no entry for an empty answer", () => {
    expect(parseFeed(feed(0))).toEqual({ total: 0, entries: [] });
  });

  it("does not take a total written inside an entry", () => {
    const sneaky = entry().replace("</entry>", "<openSearch:totalResults>99</openSearch:totalResults></entry>");
    expect(parseFeed(feed(2, [sneaky])).total).toBe(2);
  });

  it("throws a fixed message on text that is not an Atom feed", () => {
    expect(() => parseFeed("<html>Léa Martin, +41791234567</html>")).toThrow(/^searchch: invalid response$/);
  });

  it("throws the same message when a value breaks the schema", () => {
    const xml = feed(1, [entry({ name: "x".repeat(500) })]);
    expect(() => parseFeed(xml)).toThrow(/^searchch: invalid response$/);
  });
});
