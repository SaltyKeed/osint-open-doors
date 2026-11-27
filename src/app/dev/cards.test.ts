import { describe, expect, it } from "vitest";
import type { Finding } from "@/server/domain/finding";
import { accountAddresses, cardsToConfirm, confirmCards, findingId, mergeFinding } from "./cards";

// All values below are invented test data.

function finding(overrides: Partial<Finding>): Finding {
  return { field: "A1", value: "Léa Martin", sources: ["searchch"], confidence: "to_confirm", path: [], ...overrides };
}

const account = [finding({ field: "F2", value: "https://site-a.exemple.ch/lmartin_06", sources: ["whatsmyname"], card: "F2:a" })];
const first = [
  finding({ card: "A1:léa martin#1" }),
  finding({ field: "B3", value: "Rue du Lac 1, 2000 Neuchâtel", card: "A1:léa martin#1" }),
  finding({ field: "C1", value: "Neuchâtel", card: "A1:léa martin#1" }),
];
const second = [
  finding({ card: "A1:léa martin#2" }),
  finding({ field: "B3", value: "Rue du Port 2, 2000 Neuchâtel", card: "A1:léa martin#2" }),
];

describe("findingId", () => {
  it("tells apart two cards that share a name", () => {
    expect(findingId(first[0]!)).not.toBe(findingId(second[0]!));
  });

  it("is the field and the value for a finding without card", () => {
    expect(findingId(finding({ confidence: "confirmed" }))).toBe("A1\nLéa Martin");
  });
});

describe("findingId for an account", () => {
  it("ignores the card key: an account found twice is one line", () => {
    expect(findingId(account[0]!)).toBe(findingId({ ...account[0]!, card: undefined, confidence: "probable" }));
  });
});

describe("mergeFinding", () => {
  const earlier = finding({ confidence: "confirmed", sources: ["phone"], path: [{ type: "TEL", value: "+41791234567" }] });
  const later = finding({ confidence: "confirmed", sources: ["names"], path: [] });

  it("keeps the sources of both, and the shorter path", () => {
    const merged = mergeFinding(earlier, later);
    expect(merged.sources).toEqual(["phone", "names"]);
    expect(merged.path).toEqual([]);
  });

  it("keeps the surer level, whichever comes last", () => {
    expect(mergeFinding(finding({ confidence: "probable" }), finding({ confidence: "to_confirm" })).confidence).toBe("probable");
    expect(mergeFinding(finding({ confidence: "to_confirm" }), finding({ confidence: "confirmed" })).confidence).toBe("confirmed");
  });

  it("does not change its arguments", () => {
    mergeFinding(earlier, later);
    expect(earlier.sources).toEqual(["phone"]);
  });
});

describe("cardsToConfirm", () => {
  it("groups the findings to confirm by card, in the order they came", () => {
    const cards = cardsToConfirm([...account, ...first, ...second]);
    expect(cards.map((c) => [c.key, c.findings.length])).toEqual([
      ["F2:a", 1],
      ["A1:léa martin#1", 3],
      ["A1:léa martin#2", 2],
    ]);
  });

  it("leaves out what is already confirmed or has no card", () => {
    const confirmed = finding({ confidence: "confirmed", card: "A1:x" });
    expect(cardsToConfirm([confirmed, finding({})])).toEqual([]);
  });
});

describe("confirmCards", () => {
  const all = [...account, ...first, ...second, finding({ field: "C1", value: "Lausanne", confidence: "confirmed" })];

  it("confirms every finding of a ticked card and drops its card key", () => {
    const result = confirmCards(all, new Set(["A1:léa martin#1"]));
    const confirmed = result.filter((f) => f.confidence === "confirmed");
    expect(confirmed.map((f) => f.field)).toEqual(["A1", "B3", "C1", "C1"]);
    expect(confirmed.every((f) => f.card === undefined)).toBe(true);
  });

  it("removes the cards that were not ticked", () => {
    const result = confirmCards(all, new Set(["A1:léa martin#1"]));
    expect(result.some((f) => f.confidence === "to_confirm")).toBe(false);
    expect(result.some((f) => f.value === "Rue du Port 2, 2000 Neuchâtel")).toBe(false);
    expect(result).toHaveLength(4);
  });

  it("can keep the cards that were not ticked, for the summary", () => {
    const result = confirmCards(all, new Set(["F2:a"]), { dropOthers: false });
    expect(result.filter((f) => f.confidence === "to_confirm")).toHaveLength(5);
    expect(result.find((f) => f.field === "F2")?.confidence).toBe("confirmed");
  });
});

describe("accountAddresses", () => {
  it("gives the F2 address of the ticked account cards only", () => {
    const cards = cardsToConfirm([...account, ...first]);
    expect(accountAddresses(cards, new Set(["F2:a", "A1:léa martin#1"]))).toEqual(["https://site-a.exemple.ch/lmartin_06"]);
    expect(accountAddresses(cards, new Set(["A1:léa martin#1"]))).toEqual([]);
  });
});
