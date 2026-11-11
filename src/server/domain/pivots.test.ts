import { describe, expect, it } from "vitest";
import { collectPivots, emailLocalPart } from "./pivots";
import type { Finding } from "./types";

// Invented findings (fixtures never contain real data).
const findings: Finding[] = [
  { kind: "account", providerId: "github", service: "Profil GitHub @jdupont", summary: "", categories: [], matchedOn: "email", handles: ["jdupont", "jdupont_x"] },
  { kind: "account", providerId: "gravatar", service: "Profil Gravatar", summary: "", categories: [], matchedOn: "email", handles: ["JDupont"] },
  { kind: "web", providerId: "tavily", verified: true, site: "instagram.com", url: "https://instagram.com/jean.d.42", title: "", snippet: "", matchedOn: "email" },
  { kind: "web", providerId: "tavily", verified: false, site: "instagram.com", url: "https://instagram.com/homonyme", title: "", snippet: "", matchedOn: "name" },
];

describe("collectPivots", () => {
  it("collects usernames from linked accounts and verified profile pages only", () => {
    expect(collectPivots(findings, {})).toEqual([
      { username: "jdupont", origin: "Profil GitHub @jdupont" },
      { username: "jdupont_x", origin: "Profil GitHub @jdupont" },
      { username: "jean.d.42", origin: "instagram.com" },
    ]);
  });

  it("starts with the part of the email before the @", () => {
    expect(collectPivots(findings, { email: "jean.dupont+news@example.com" })[0]).toEqual({
      username: "jean.dupont",
      origin: "la partie de ton email avant le @",
    });
  });

  it("ignores generic mailbox names", () => {
    expect(emailLocalPart("info@example.com")).toBeNull();
    expect(emailLocalPart("contact@example.com")).toBeNull();
  });

  it("skips the username already typed by the visitor and respects the limit", () => {
    const pivots = collectPivots(findings, { username: "JDUPONT" }, 1);
    expect(pivots).toEqual([{ username: "jdupont_x", origin: "Profil GitHub @jdupont" }]);
  });
});
