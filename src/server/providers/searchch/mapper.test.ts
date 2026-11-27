import { describe, expect, it } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import { toRecords } from "./mapper";
import type { SearchChEntry } from "./parse";

// All values below are invented test data.

const person: SearchChEntry = {
  type: "Person",
  name: "Martin",
  firstname: "Léa",
  street: "Rue du Lac",
  streetno: "1",
  zip: "2000",
  city: "Neuchâtel",
  phone: "+41791234567",
};
const organisation: SearchChEntry = { ...person, type: "Organisation", name: "Exemple SA", firstname: undefined };
const tel: Identifier = { type: "TEL", value: "+41791234567" };
const nom: Identifier = { type: "NOM", value: "Léa Martin" };

describe("toRecords for a phone number", () => {
  it("gives the holder, the address and the city of a person", () => {
    expect(toRecords({ total: 1, entries: [person] }, tel)).toStrictEqual([
      {
        about: "subject",
        fields: [
          { field: "A1", value: "Léa Martin", holder: true },
          { field: "B3", value: "Rue du Lac 1, 2000 Neuchâtel" },
          { field: "C1", value: "Neuchâtel" },
        ],
        identifiers: [],
      },
    ]);
  });

  it("never attaches an organisation to the visitor", () => {
    expect(toRecords({ total: 1, entries: [organisation] }, tel)).toEqual([]);
  });

  it("keeps the person when an organisation comes first", () => {
    expect(toRecords({ total: 2, entries: [organisation, person] }, tel)).toHaveLength(1);
  });

  it("leaves out B3 when there is no street", () => {
    const [record] = toRecords({ total: 1, entries: [{ ...person, street: undefined, streetno: undefined }] }, tel);
    expect(record?.fields.map((f) => f.field)).toEqual(["A1", "C1"]);
  });

  it("writes the address without the missing parts", () => {
    const [record] = toRecords({ total: 1, entries: [{ ...person, streetno: undefined, zip: undefined }] }, tel);
    expect(record?.fields.find((f) => f.field === "B3")?.value).toBe("Rue du Lac, Neuchâtel");
  });

  it("does not repeat the first name when the name already holds it", () => {
    const [record] = toRecords({ total: 1, entries: [{ ...person, name: "Martin Léa" }] }, tel);
    expect(record?.fields[0]?.value).toBe("Martin Léa");
  });

  it("ignores an entry that gives no number: it could be a stranger's", () => {
    expect(toRecords({ total: 1, entries: [{ ...person, phone: undefined }] }, tel)).toEqual([]);
  });

  it("keeps a first name that is the same as the name", () => {
    const [record] = toRecords({ total: 1, entries: [{ ...person, name: "Martin", firstname: "Martin" }] }, tel);
    expect(record?.fields[0]?.value).toBe("Martin Martin");
  });

  it("ignores an entry listed for another number", () => {
    expect(toRecords({ total: 1, entries: [{ ...person, phone: "+41327174020" }] }, tel)).toEqual([]);
  });
});

describe("toRecords for a name", () => {
  it("gives one card per person, with the number of homonyms and no holder", () => {
    const other = { ...person, street: "Rue du Port", streetno: "2" };
    const records = toRecords({ total: 2, entries: [person, other] }, nom);
    expect(records).toHaveLength(2);
    expect(records[0]).toStrictEqual({
      about: "subject",
      homonyms: 2,
      fields: [
        { field: "A1", value: "Léa Martin" },
        { field: "B3", value: "Rue du Lac 1, 2000 Neuchâtel" },
        { field: "C1", value: "Neuchâtel" },
      ],
      identifiers: [],
    });
    expect(records[1]?.homonyms).toBe(2);
  });

  it("keeps only the number when there are too many people of this name", () => {
    expect(toRecords({ total: 12, entries: [person, person, person] }, nom)).toStrictEqual([
      { about: "subject", homonyms: 12, fields: [], identifiers: [] },
    ]);
  });

  it("gives nothing when nobody has this name", () => {
    expect(toRecords({ total: 0, entries: [] }, nom)).toEqual([]);
  });
});
