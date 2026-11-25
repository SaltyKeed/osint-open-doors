import { describe, expect, it } from "vitest";
import { splitNdjson } from "./ndjson";

describe("splitNdjson", () => {
  it("parses complete lines and keeps the unfinished one", () => {
    expect(splitNdjson('{"a":1}\n{"b":2}\n{"c":')).toEqual({ events: [{ a: 1 }, { b: 2 }], rest: '{"c":' });
  });

  it("ignores empty lines", () => {
    expect(splitNdjson('{"a":1}\n\n')).toEqual({ events: [{ a: 1 }], rest: "" });
  });

  it("returns the whole text as rest when no line is complete", () => {
    expect(splitNdjson('{"a"')).toEqual({ events: [], rest: '{"a"' });
  });
});
