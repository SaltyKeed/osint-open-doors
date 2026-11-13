import { describe, expect, it } from "vitest";
import { isConfirmedMatch, splitByMatch } from "./matching";
import type { SearchQuery } from "./types";

// All values below are invented test data.

const query: SearchQuery = { phone: "+41791234567", name: { first: "Jean", last: "Dupont" } };

describe("isConfirmedMatch", () => {
  it("never confirms a record on the name alone", () => {
    expect(isConfirmedMatch({ name: { first: "Jean", last: "Dupont" } }, query)).toBe(false);
  });

  it("rejects a same-name record with another phone", () => {
    expect(
      isConfirmedMatch({ name: { first: "Jean", last: "Dupont" }, phone: "+41790000000" }, query),
    ).toBe(false);
  });

  it("confirms the phone whatever its format in the record", () => {
    expect(isConfirmedMatch({ phone: "079 123 45 67" }, query)).toBe(true);
  });

  it("confirms the email whatever its case in the record", () => {
    expect(isConfirmedMatch({ email: "JEAN@EXEMPLE.CH" }, { email: "jean@exemple.ch" })).toBe(true);
  });

  it("rejects a record with an email when the visitor gave none", () => {
    expect(isConfirmedMatch({ email: "jean@exemple.ch" }, query)).toBe(false);
  });

  it("rejects a record with an unreadable phone", () => {
    expect(isConfirmedMatch({ phone: "inconnu" }, query)).toBe(false);
  });

  it("rejects an empty record", () => {
    expect(isConfirmedMatch({}, query)).toBe(false);
  });
});

describe("splitByMatch", () => {
  it("keeps confirmed records and only counts the others", () => {
    expect(
      splitByMatch([{ phone: "079 123 45 67" }, { name: { first: "Jean", last: "Dupont" } }, {}], query),
    ).toEqual({ confirmed: [{ phone: "079 123 45 67" }], homonymCount: 2 });
  });

  it("returns nothing for an empty list", () => {
    expect(splitByMatch([], query)).toEqual({ confirmed: [], homonymCount: 0 });
  });
});
