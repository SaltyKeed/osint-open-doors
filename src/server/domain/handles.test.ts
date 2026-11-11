import { describe, expect, it } from "vitest";
import { handleFromProfileUrl, isUsableHandle } from "./handles";

describe("handleFromProfileUrl", () => {
  it("reads the username in common profile addresses", () => {
    expect(handleFromProfileUrl("https://www.instagram.com/jdupont_42/")).toBe("jdupont_42");
    expect(handleFromProfileUrl("https://github.com/jdupont")).toBe("jdupont");
    expect(handleFromProfileUrl("https://x.com/jdupont?lang=fr")).toBe("jdupont");
    expect(handleFromProfileUrl("https://twitter.com/jdupont/status/123")).toBe("jdupont");
    expect(handleFromProfileUrl("https://www.tiktok.com/@jdupont")).toBe("jdupont");
    expect(handleFromProfileUrl("https://www.youtube.com/@jdupont")).toBe("jdupont");
    expect(handleFromProfileUrl("https://www.reddit.com/user/jdupont")).toBe("jdupont");
    expect(handleFromProfileUrl("https://ch.linkedin.com/in/jean-dupont-1234")).toBe("jean-dupont-1234");
  });

  it("ignores pages that are not a profile", () => {
    expect(handleFromProfileUrl("https://github.com/features")).toBeNull();
    expect(handleFromProfileUrl("https://www.instagram.com/p/AbC123/")).toBeNull();
    expect(handleFromProfileUrl("https://news.example/article")).toBeNull();
    expect(handleFromProfileUrl("not a url")).toBeNull();
  });
});

describe("isUsableHandle", () => {
  it("accepts usual usernames and rejects too short or odd ones", () => {
    expect(isUsableHandle("jdupont_42")).toBe(true);
    expect(isUsableHandle("ab")).toBe(false);
    expect(isUsableHandle("has space")).toBe(false);
  });
});
