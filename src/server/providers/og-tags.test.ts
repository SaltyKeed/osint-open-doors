import { describe, expect, it } from "vitest";
import { displayName, readOembed, readOgTags, readTextPrefix } from "./og-tags";

// All values below are invented test data.

describe("readOembed", () => {
  it("reads the author name of an oEmbed answer, like TikTok gives for a profile", () => {
    const body = JSON.stringify({ type: "rich", author_name: "L&eacute;a  Martin", author_url: "https://www.tiktok.com/@lmartin_06" });
    expect(readOembed(body)).toEqual({ title: "Léa Martin" });
  });

  it("keeps an https thumbnail as the photo", () => {
    const body = JSON.stringify({ author_name: "Léa Martin", thumbnail_url: "https://cdn.exemple.ch/p.jpg" });
    expect(readOembed(body)).toEqual({ title: "Léa Martin", image: "https://cdn.exemple.ch/p.jpg" });
  });

  it.each([
    ["not JSON", "<html></html>"],
    ["JSON without author name", '{"username": "lmartin_06"}'],
    ["author name not a string", '{"author_name": 42}'],
    ["a JSON list", "[1, 2]"],
  ])("returns nothing for %s", (_case, body) => {
    expect(readOembed(body)).toEqual({});
  });

  it("drops an http or IP thumbnail", () => {
    expect(readOembed(JSON.stringify({ author_name: "Léa Martin", thumbnail_url: "http://192.168.1.1/p.jpg" }))).toEqual({
      title: "Léa Martin",
    });
  });
});

describe("readOgTags", () => {
  it("reads the three tags, whatever the order of the attributes", () => {
    const html = `<meta property="og:title" content="Léa Martin">
      <meta content="https://cdn.exemple.ch/a.jpg" property="og:image">
      <meta name="og:description" content="Photographe à Neuchâtel">`;
    expect(readOgTags(html)).toEqual({
      title: "Léa Martin",
      image: "https://cdn.exemple.ch/a.jpg",
      description: "Photographe à Neuchâtel",
    });
  });

  it("decodes HTML entities and collapses spaces", () => {
    expect(readOgTags('<meta property="og:title" content="L&eacute;a  &amp; Co &#39;x&#x27;">').title).toBe("Léa & Co 'x'");
  });

  it.each(["javascript:alert(1)", "data:image/png;base64,AAAA", "/relative.jpg"])("drops the image %s", (image) => {
    expect(readOgTags(`<meta property="og:image" content="${image}">`).image).toBeUndefined();
  });

  it("cuts a long title and a long description", () => {
    const html = `<meta property="og:title" content="${"a".repeat(300)}"><meta property="og:description" content="${"b".repeat(900)}">`;
    expect(readOgTags(html).title).toHaveLength(200);
    expect(readOgTags(html).description).toHaveLength(500);
  });

  it("returns an empty object for a page without tags or an empty content", () => {
    expect(readOgTags('<html><meta property="og:title" content="  "></html>')).toEqual({});
  });

  it("keeps a > inside a quoted attribute value", () => {
    expect(readOgTags('<meta property="og:title" content="Léa > Paul">').title).toBe("Léa > Paul");
  });

  it("decodes the common named entities", () => {
    expect(readOgTags('<meta property="og:title" content="L&eacute;a M&uuml;ller &amp; l&rsquo;&Eacute;t&eacute; &ndash; &hellip;">').title).toBe(
      "Léa Müller & l’Été – …",
    );
  });

  describe("image", () => {
    const image = (content: string, baseUrl?: string) =>
      readOgTags(`<meta property="og:image" content="${content}">`, baseUrl).image;

    it.each(["http://cdn.exemple.ch/a.jpg", "https://127.0.0.1/a.jpg", "https://192.168.1.1/a.jpg", "https://[::1]/a.jpg", "https://localhost/a.jpg", "https://app.localhost/a.jpg"])(
      "drops %s: not https, an IP address or localhost",
      (value) => expect(image(value)).toBeUndefined(),
    );

    it("keeps an https image from a named host", () => {
      expect(image("https://cdn.exemple.ch/a.jpg")).toBe("https://cdn.exemple.ch/a.jpg");
    });

    it("resolves a protocol-relative and a relative address against the page address", () => {
      const base = "https://site.exemple.ch/u/lmartin_06";
      expect(image("//cdn.exemple.ch/a.jpg", base)).toBe("https://cdn.exemple.ch/a.jpg");
      expect(image("/img/a.jpg", base)).toBe("https://site.exemple.ch/img/a.jpg");
      expect(image("a.jpg", base)).toBe("https://site.exemple.ch/u/a.jpg");
    });

    it("drops a relative address without a page address, and one that resolves to http", () => {
      expect(image("//cdn.exemple.ch/a.jpg")).toBeUndefined();
      expect(image("/img/a.jpg", "http://site.exemple.ch/u/x")).toBeUndefined();
    });
  });
});

describe("displayName", () => {
  it.each([
    ["Léa Martin (@lmartin_06) • Instagram photos and videos", "Léa Martin"],
    ["Léa Martin | Portfolio", "Léa Martin"],
    ["Léa Martin · Behance", "Léa Martin"],
    ["Léa Martin - GitHub", "Léa Martin"],
    ["Léa Martin — Medium", "Léa Martin"],
    ["Jean-Pierre Dupont", "Jean-Pierre Dupont"],
    [" | Instagram", " | Instagram"],
  ])("%s gives %s", (title, expected) => expect(displayName(title)).toBe(expected));
});

describe("readTextPrefix", () => {
  it("reads at most the limit and cancels the rest of the stream", async () => {
    let cancelled = false;
    const chunk = new TextEncoder().encode("a".repeat(1000));
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    const text = await readTextPrefix(new Response(body), 2500);
    expect(text.length).toBeLessThanOrEqual(2500);
    expect(text.length).toBeGreaterThan(2000);
    expect(cancelled).toBe(true);
    expect(sent).toBeLessThan(10);
  });

  it("reads a short body whole, and an empty one", async () => {
    expect(await readTextPrefix(new Response("bonjour"), 100)).toBe("bonjour");
    expect(await readTextPrefix(new Response(null), 100)).toBe("");
  });
});
