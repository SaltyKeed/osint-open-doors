import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classify, extractTargets } from "./check-sources";

const catalogue = `
# Catalogue

Prose with \`https://ignored.example/in-prose\` is not a source.

| Service | Appel | Accès |
| --- | --- | --- |
| [GitHub](https://github.com) | \`GET https://api.github.com/search/commits?q=author-email:{email}\` puis \`GET https://api.github.com/users/{login}\` | Gratuit |
| GitLab | \`GET https://gitlab.com/api/v4/users?username={pseudo}\` | Gratuit |
| Hudson Rock | \`GET https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=…\` | Gratuit |
| GitHub (pseudo) | \`GET https://api.github.com/users/{pseudo}\` | Gratuit |
| ip-api.com | \`GET http://ip-api.com/json/{ip}\` | Gratuit |
| LeakRadar | API REST | Payant |
`;

describe("extractTargets", () => {
  const targets = extractTargets(catalogue);

  it("keeps one target per host, from the call column of the tables", () => {
    expect(targets.map((t) => t.origin)).toEqual([
      "https://api.github.com",
      "https://gitlab.com",
      "https://cavalier.hudsonrock.com",
      "http://ip-api.com",
    ]);
  });

  it("lists every source that uses the same host", () => {
    expect(targets[0]?.names).toEqual(["GitHub", "GitHub (pseudo)"]);
  });

  it("probes the API path of the first call, cut before any value", () => {
    expect(targets.map((t) => t.url)).toEqual([
      "https://api.github.com/search/commits",
      "https://gitlab.com/api/v4/users",
      "https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email",
      "http://ip-api.com/json/",
    ]);
  });

  it("ignores URLs in prose, links in the name column and rows without a URL", () => {
    const origins = targets.map((t) => t.origin);
    expect(origins).not.toContain("https://ignored.example");
    expect(origins).not.toContain("https://github.com");
    expect(targets.flatMap((t) => t.names)).not.toContain("LeakRadar");
  });

  it("finds the main free sources in the real catalogue", () => {
    const real = readFileSync(new URL("../docs/SOURCES.md", import.meta.url), "utf8");
    const origins = extractTargets(real).map((t) => t.origin);
    expect(origins).toEqual(
      expect.arrayContaining([
        "https://api.github.com",
        "https://api.gravatar.com",
        "https://cavalier.hudsonrock.com",
        "https://api.xposedornot.com",
        "https://haveibeenpwned.com",
      ]),
    );
  });
});

describe("classify", () => {
  const origin = "https://api.github.com";

  it("any HTTP answer means the host is reachable, even 401 or 404", () => {
    expect(classify(origin, { status: 200 }).verdict).toBe("reachable");
    expect(classify(origin, { status: 401 }).verdict).toBe("reachable");
    expect(classify(origin, { status: 404 }).verdict).toBe("reachable");
  });

  it("429 is reachable but flagged: the shared IP may already use the quota", () => {
    const result = classify(origin, { status: 429 });
    expect(result.verdict).toBe("reachable");
    expect(result.detail).toContain("quota");
  });

  it("a redirect to the same site is reachable", () => {
    expect(classify(origin, { status: 301, location: "https://api.github.com/" }).verdict).toBe(
      "reachable",
    );
    expect(classify(origin, { status: 302, location: "/login" }).verdict).toBe("reachable");
  });

  it("a redirect to another host of the same domain is reachable", () => {
    expect(
      classify("https://gitlab.com", { status: 301, location: "https://about.gitlab.com/" }).verdict,
    ).toBe("reachable");
    expect(
      classify("https://api.search.brave.com", {
        status: 301,
        location: "https://api-dashboard.search.brave.com/",
      }).verdict,
    ).toBe("reachable");
  });

  it("a redirect to another site looks like a filter page", () => {
    const result = classify(origin, { status: 302, location: "https://filter.school.example/block" });
    expect(result.verdict).toBe("redirected");
    expect(result.detail).toContain("filter.school.example");
  });

  it("network errors mean blocked, with a readable reason", () => {
    expect(classify(origin, { error: "ENOTFOUND" })).toEqual({
      verdict: "blocked",
      detail: "nom de domaine introuvable (DNS)",
    });
    expect(classify(origin, { error: "TimeoutError" }).detail).toBe("pas de réponse en 10 secondes");
    expect(classify(origin, { error: "SELF_SIGNED_CERT_IN_CHAIN" }).detail).toContain("certificat");
    expect(classify(origin, { error: "SOMETHING_NEW" }).detail).toBe("erreur réseau (SOMETHING_NEW)");
  });
});
