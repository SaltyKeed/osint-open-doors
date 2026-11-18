import { describe, expect, it, vi } from "vitest";
import type { Identifier, IdentifierType } from "@/server/domain/identifier";
import type { Source, SourceRecord } from "@/server/domain/source";
import { searchAll } from "./search-service";

// All values below are invented test data.

const record = (value: string): SourceRecord => ({
  about: "subject",
  fields: [{ field: "H1", value }],
  identifiers: [],
});

const fake = (id: string, investigate: Source["investigate"], accepts: IdentifierType[] = ["EMAIL"]) => ({
  id,
  accepts,
  investigate: vi.fn(investigate),
  inspect: vi.fn(),
});

const email: Identifier = { type: "EMAIL", value: "jean@exemple.ch" };
const phone: Identifier = { type: "TEL", value: "+41791234567" };

describe("searchAll", () => {
  it("joins the records of all sources", async () => {
    const result = await searchAll(
      [email],
      [fake("a", async () => [record("ShopA")]), fake("b", async () => [record("ShopB")])],
    );
    expect(result).toEqual({ records: [record("ShopA"), record("ShopB")], failedSources: [] });
  });

  it("gives each identifier only to the sources that accept its type", async () => {
    const emailOnly = fake("email", async () => [record("ShopA")]);
    const phoneOnly = fake("phone", async () => [record("ShopB")], ["TEL"]);
    await searchAll([email, phone], [emailOnly, phoneOnly]);
    expect(emailOnly.investigate).toHaveBeenCalledExactlyOnceWith(email, expect.any(AbortSignal));
    expect(phoneOnly.investigate).toHaveBeenCalledExactlyOnceWith(phone, expect.any(AbortSignal));
  });

  it("lists a throwing source in failedSources, once, and keeps the others", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = fake("broken", async () => {
      throw new Error("broken: HTTP 500");
    }, ["EMAIL", "TEL"]);
    const result = await searchAll([email, phone], [broken, fake("ok", async () => [record("ShopA")])]);
    expect(result).toEqual({ records: [record("ShopA")], failedSources: ["broken"] });
  });

  it("fails a source that exceeds the timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const slow = fake(
      "slow",
      (_input, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    );
    expect(await searchAll([email], [slow], 50)).toEqual({ records: [], failedSources: ["slow"] });
  });

  it("logs the source id only, never the error message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await searchAll(
      [email],
      [
        fake("broken", async () => {
          throw new Error("jean@exemple.ch");
        }),
      ],
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("jean");
  });
});
