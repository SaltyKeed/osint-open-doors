import { describe, expect, it } from "vitest";
import { ownDomain } from "./email-domain";

describe("ownDomain", () => {
  it("keeps the domain of an organization or a personal site", () => {
    expect(ownDomain("jean@ecole-exemple.ch")).toBe("ecole-exemple.ch");
    expect(ownDomain("Jean@Mon-Site.CH")).toBe("mon-site.ch");
  });

  it("ignores shared mailbox providers and invalid input", () => {
    expect(ownDomain("jean@gmail.com")).toBeUndefined();
    expect(ownDomain("jean@bluewin.ch")).toBeUndefined();
    expect(ownDomain("jean")).toBeUndefined();
    expect(ownDomain(undefined)).toBeUndefined();
  });
});
