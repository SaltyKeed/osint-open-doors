import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier } from "@/server/domain/identifier";
import { whatsMyName, WMN_SITES } from "./index";

// All values below are invented test data.
const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("whatsMyName source", () => {
  it("keeps 569 sites of the frozen list and declares them", () => {
    expect(WMN_SITES).toHaveLength(569);
    expect(whatsMyName.sitesChecked).toBe(569);
  });

  it("has its own call timeout, longer than the 8 seconds of the engine", () => {
    expect(whatsMyName.callTimeoutMs).toBe(25_000);
  });

  it("returns one record per account found, with its address only, and no identifier to search again", async () => {
    const first = WMN_SITES[0]!;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === first.uri_check.replace("{account}", "lmartin_06")
          ? new Response(`<html>${first.e_string}</html>`, { status: first.e_code })
          : new Response("", { status: 599 }),
      ),
    );
    const records = await whatsMyName.investigate(pseudo, new AbortController().signal);
    expect(records).toEqual([
      {
        about: "subject",
        fields: [{ field: "F2", value: (first.uri_pretty ?? first.uri_check).replace("{account}", "lmartin_06") }],
        identifiers: [],
      },
    ]);
  });

  it("does not call fetch for a type it does not accept", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const email: Identifier = { type: "EMAIL", value: "lea@exemple.ch" };
    expect(await whatsMyName.investigate(email, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
