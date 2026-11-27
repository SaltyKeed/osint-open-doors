import { afterEach, describe, expect, it, vi } from "vitest";
import type { Identifier, IdentifierType } from "@/server/domain/identifier";
import { SourceQuotaError, type Source, type SourceRecord } from "@/server/domain/source";
import { investigate, type InvestigationEvent } from "./investigation";

// All values below are invented test data.

const email: Identifier = { type: "EMAIL", value: "lea.martin@exemple.ch" };
const tel: Identifier = { type: "TEL", value: "+41791234567" };
const name: Identifier = { type: "NOM", value: "Léa Martin" };

function record(overrides: Partial<SourceRecord>): SourceRecord {
  return { about: "subject", fields: [], identifiers: [], ...overrides };
}

function fake(
  id: string,
  accepts: IdentifierType[],
  respond: (input: Identifier, signal: AbortSignal) => SourceRecord[] | Promise<SourceRecord[]>,
  extra: Partial<Source> = {},
) {
  return { id, accepts, investigate: vi.fn(async (input: Identifier, signal: AbortSignal) => respond(input, signal)), inspect: vi.fn(), ...extra };
}

async function run(inputs: Identifier[], sources: Source[], options: { signal?: AbortSignal; callTimeoutMs?: number; alreadySearched?: Identifier[]; alreadyConfirmed?: Identifier[] } = {}) {
  const events: InvestigationEvent[] = [];
  for await (const event of investigate(inputs, sources, { signal: options.signal ?? new AbortController().signal, ...options })) {
    events.push(event);
  }
  return events;
}

const ofType = <T extends InvestigationEvent["type"]>(events: InvestigationEvent[], type: T) =>
  events.filter((e): e is Extract<InvestigationEvent, { type: T }> => e.type === type);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("investigate", () => {
  it("searches again a phone found with the email, and keeps the path", async () => {
    const byEmail = fake("a", ["EMAIL"], () => [record({ fields: [{ field: "B2", value: "079 123 45 67" }], identifiers: [tel] })]);
    const byTel = fake("b", ["TEL"], () => [record({ fields: [{ field: "C1", value: "Neuchâtel" }] })]);
    const events = await run([email], [byEmail, byTel]);

    expect(ofType(events, "lead")).toEqual([{ type: "lead", identifier: tel, confidence: "confirmed", path: [email] }]);
    expect(byTel.investigate).toHaveBeenCalledWith(tel, expect.any(AbortSignal));
    const city = ofType(events, "finding").find((e) => e.finding.field === "C1");
    expect(city?.finding).toMatchObject({ value: "Neuchâtel", confidence: "confirmed", sources: ["b"], path: [email, tel] });
  });

  it("searches an identifier once, even when it is found twice", async () => {
    const byEmail = fake("a", ["EMAIL"], () => [record({ identifiers: [tel] }), record({ identifiers: [tel] })]);
    const byTel = fake("b", ["TEL"], () => []);
    const events = await run([email], [byEmail, byTel]);
    expect(byTel.investigate).toHaveBeenCalledOnce();
    expect(ofType(events, "lead")).toHaveLength(1);
  });

  it("never searches a name found by a source", async () => {
    const byEmail = fake("a", ["EMAIL"], () => [record({ identifiers: [name] })]);
    const byName = fake("b", ["NOM"], () => []);
    await run([email], [byEmail, byName]);
    expect(byName.investigate).not.toHaveBeenCalled();
  });

  it("never searches an identifier found about a relative", async () => {
    const byEmail = fake("a", ["EMAIL"], () => [record({ about: "relative", identifiers: [tel] })]);
    const byTel = fake("b", ["TEL"], () => []);
    await run([email], [byEmail, byTel]);
    expect(byTel.investigate).not.toHaveBeenCalled();
  });

  describe("pseudos", () => {
    const city = { field: "C1" as const, value: "Neuchâtel" };
    const first: Identifier = { type: "PSEUDO", value: "lmartin_06" };
    const second: Identifier = { type: "PSEUDO", value: "leamartin_ne" };
    const profile: Identifier = { type: "PROFIL", value: "https://forum.example/u/leamartin" };

    const byEmail = () => fake("leaks", ["EMAIL"], () => [record({ fields: [city], identifiers: [first] })]);
    const byPseudo = (extra: Partial<Source> = {}) =>
      fake(
        "pseudos",
        ["PSEUDO"],
        (input) =>
          input.value === first.value
            ? [record({ fields: [city, { field: "F2", value: "https://games.example/lmartin_06" }], identifiers: [second] })]
            : [record({ fields: [city], identifiers: [profile] })],
        extra,
      );

    it("gives « probable » to what a rare pseudo finds with a coherent hint", async () => {
      const events = await run([email], [byEmail(), byPseudo()]);
      const account = ofType(events, "finding").find((e) => e.finding.field === "F2");
      expect(account?.finding.confidence).toBe("probable");
      expect(ofType(events, "lead").map((e) => [e.identifier.value, e.confidence])).toContainEqual([second.value, "probable"]);
    });

    it("does not search again what a probable pseudo finds, unless it is confirmed", async () => {
      const byProfile = fake("profiles", ["PROFIL"], () => []);
      await run([email], [byEmail(), byPseudo(), byProfile]);
      expect(byProfile.investigate).not.toHaveBeenCalled();
    });

    it("counts as hidden what a pseudo found on too many sites gives", async () => {
      const events = await run([email], [byEmail(), byPseudo({ sitesChecked: 5 })]);
      expect(ofType(events, "finding").some((e) => e.finding.field === "F2")).toBe(false);
      expect(ofType(events, "done")[0]?.hidden.possible).toBeGreaterThan(0);
    });
  });

  it("counts a record found by name only as a namesake, without showing it", async () => {
    const byName = fake("directory", ["NOM"], () => [record({ fields: [{ field: "C1", value: "Lausanne" }] })]);
    const events = await run([name], [byName]);
    expect(ofType(events, "finding")).toEqual([]);
    expect(ofType(events, "done")).toEqual([{ type: "done", hidden: { possible: 0, namesake: 1 } }]);
  });

  it("merges the same breach seen by two sources", async () => {
    const breach = () => [record({ fields: [{ field: "H1", value: "ExampleShop" }] })];
    const events = await run([email], [fake("a", ["EMAIL"], breach), fake("b", ["EMAIL"], breach)]);
    const findings = ofType(events, "finding");
    expect(findings.at(-1)?.finding.sources).toEqual(["a", "b"]);
  });

  it("reports a failing source, logs its id only, and still uses it for the next identifier", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const byEmail = fake("a", ["EMAIL"], () => [record({ identifiers: [tel] })]);
    const flaky = fake("flaky", ["EMAIL", "TEL"], (input) => {
      if (input.type === "EMAIL") throw new Error(`boom ${input.value}`);
      return [];
    });
    const events = await run([email], [byEmail, flaky]);
    expect(ofType(events, "source-failed")).toEqual([{ type: "source-failed", source: "flaky", reason: "error" }]);
    expect(flaky.investigate).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(log.mock.calls)).not.toContain("lea");
  });

  it("stops calling a source whose quota is reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const byEmail = fake("a", ["EMAIL"], () => [record({ identifiers: [tel] })]);
    const limited = fake("limited", ["EMAIL", "TEL"], () => {
      throw new SourceQuotaError("limited");
    });
    const events = await run([email], [byEmail, limited]);
    expect(ofType(events, "source-failed")).toEqual([{ type: "source-failed", source: "limited", reason: "quota" }]);
    expect(limited.investigate).toHaveBeenCalledOnce();
  });

  it("fails a source slower than the call timeout, and keeps the others", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const slow = fake(
      "slow",
      ["EMAIL"],
      (_input, signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
    );
    const fast = fake("fast", ["EMAIL"], () => [record({ fields: [{ field: "H1", value: "ExampleShop" }] })]);
    const events = await run([email], [slow, fast], { callTimeoutMs: 20 });
    expect(ofType(events, "source-failed")).toEqual([{ type: "source-failed", source: "slow", reason: "error" }]);
    expect(ofType(events, "finding")).toHaveLength(1);
  });

  it("stops when the visitor leaves: no new call, no done", async () => {
    const controller = new AbortController();
    const byEmail = fake("a", ["EMAIL"], () => {
      controller.abort();
      return [record({ identifiers: [tel] })];
    });
    const byTel = fake("b", ["TEL"], () => []);
    const events = await run([email], [byEmail, byTel], { signal: controller.signal });
    expect(byTel.investigate).not.toHaveBeenCalled();
    expect(ofType(events, "done")).toEqual([]);
  });

  it("stops calling a source after its maximum number of calls for one investigation", async () => {
    const byEmail = fake("a", ["EMAIL"], () => [record({ identifiers: [tel] })]);
    const limited = fake("web", ["EMAIL", "TEL"], () => [], { maxCallsPerInvestigation: 1 });
    await run([email], [byEmail, limited]);
    expect(limited.investigate).toHaveBeenCalledExactlyOnceWith(email, expect.any(AbortSignal));
  });

  it("asks the visitor about accounts found by a rare pseudo, without searching them again", async () => {
    const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };
    const sites = fake(
      "sites",
      ["PSEUDO"],
      () => [
        record({ fields: [{ field: "F2", value: "https://site-a.exemple.ch/lmartin_06" }] }),
        record({ fields: [{ field: "F2", value: "https://site-b.exemple.ch/lmartin_06" }] }),
      ],
      { sitesChecked: 100 },
    );
    const events = await run([pseudo], [sites]);
    expect(ofType(events, "finding").map((e) => [e.finding.field, e.finding.confidence])).toEqual([
      ["F2", "to_confirm"],
      ["F2", "to_confirm"],
    ]);
    expect(ofType(events, "lead")).toEqual([]);
    expect(ofType(events, "done")[0]?.hidden).toEqual({ possible: 0, namesake: 0 });
  });

  describe("name and photo read on a found account (T10)", () => {
    const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };
    const address = "https://site-a.exemple.ch/lmartin_06";
    const photo = "https://cdn.exemple.ch/p.jpg";
    const sitesWith = (displayedName: string) =>
      fake(
        "sites",
        ["PSEUDO"],
        () => [
          record({
            fields: [
              { field: "F2", value: address, profile: { name: displayedName, photo } },
              { field: "A1", value: displayedName },
              { field: "A5", value: photo },
            ],
          }),
        ],
        { sitesChecked: 100 },
      );

    it("sends only the address of an account to confirm: the name and photo of a stranger are not findings", async () => {
      const events = await run([pseudo, name], [sitesWith("Paul Durand")]);
      const findings = ofType(events, "finding");
      expect(findings).toHaveLength(1);
      expect(findings[0]?.finding).toMatchObject({
        field: "F2",
        confidence: "to_confirm",
        profile: { name: "Paul Durand", photo },
      });
    });

    it("shows name and photo as probable when the displayed name is the visitor's", async () => {
      const events = await run([pseudo, name], [sitesWith("Léa Martin")]);
      const findings = ofType(events, "finding").map((e) => [e.finding.field, e.finding.confidence]);
      expect(findings).toEqual([
        ["F2", "probable"],
        ["A1", "probable"],
        ["A5", "probable"],
      ]);
    });
  });

  it("keeps hidden a full profile found by a rare pseudo on a source without a list of sites", async () => {
    const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };
    const profiles = fake("profiles", ["PSEUDO"], () => [
      record({ fields: [{ field: "A1", value: "Paul Durand" }, { field: "B1", value: "paul@exemple.ch" }] }),
    ]);
    const events = await run([pseudo], [profiles]);
    expect(ofType(events, "finding")).toEqual([]);
    expect(ofType(events, "done")[0]?.hidden).toEqual({ possible: 1, namesake: 0 });
  });

  it("gives a source its own call timeout when it declares one", async () => {
    const slowButAllowed = fake(
      "sites",
      ["EMAIL"],
      (_input, signal) =>
        new Promise<SourceRecord[]>((resolve, reject) => {
          const timer = setTimeout(() => resolve([record({ fields: [{ field: "H1", value: "ExampleShop" }] })]), 60);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(signal.reason);
          });
        }),
      { callTimeoutMs: 1000 },
    );
    const events = await run([email], [slowButAllowed], { callTimeoutMs: 20 });
    expect(ofType(events, "finding")).toHaveLength(1);
  });

  it("does not search again what was already searched", async () => {
    const byEmail = fake("a", ["EMAIL"], () => [record({ fields: [{ field: "H1", value: "ExampleShop" }] })]);
    const events = await run([email], [byEmail], { alreadySearched: [email] });
    expect(byEmail.investigate).not.toHaveBeenCalled();
    expect(events).toEqual([{ type: "done", hidden: { possible: 0, namesake: 0 } }]);
  });

  it("still treats an already searched input as confirmed", async () => {
    const profil: Identifier = { type: "PROFIL", value: "https://site-a.exemple.ch/lmartin_06" };
    const byEmail = fake("a", ["EMAIL"], () => []);
    const byProfil = fake("b", ["PROFIL"], () => [
      record({ fields: [{ field: "A1", value: "Léa Martin" }], identifiers: [email] }),
    ]);
    const events = await run([email, profil], [byEmail, byProfil], { alreadySearched: [email] });
    const nameFinding = ofType(events, "finding").find((e) => e.finding.field === "A1");
    expect(nameFinding?.finding.confidence).toBe("confirmed");
    expect(byEmail.investigate).not.toHaveBeenCalled();
  });

  it("treats an identifier confirmed in the first round as confirmed, without searching it again", async () => {
    const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };
    const byEmail = fake("a", ["EMAIL"], () => []);
    const byPseudo = fake("b", ["PSEUDO"], () => [
      record({ fields: [{ field: "C1", value: "Neuchâtel" }], identifiers: [email] }),
    ]);
    // Control: without the memory of the first round, a record found by a pseudo alone stays hidden.
    const alone = await run([pseudo], [byEmail, byPseudo]);
    expect(ofType(alone, "finding")).toEqual([]);

    const events = await run([pseudo], [byEmail, byPseudo], { alreadySearched: [email], alreadyConfirmed: [email] });
    const city = ofType(events, "finding").find((e) => e.finding.field === "C1");
    expect(city?.finding.confidence).toBe("confirmed");
    expect(byEmail.investigate).not.toHaveBeenCalledWith(email, expect.anything());
  });

  it("caps at probable what a bio only cites, and what is found with it (T10)", async () => {
    const profil: Identifier = { type: "PROFIL", value: "https://site-a.exemple.ch/lmartin_06" };
    const byProfil = fake("profile-page", ["PROFIL"], () => [
      record({ mentioned: true, identifiers: [email] }),
    ]);
    const byEmail = fake("a", ["EMAIL"], () => [record({ fields: [{ field: "C1", value: "Neuchâtel" }] })]);
    const events = await run([profil], [byProfil, byEmail]);
    expect(ofType(events, "lead")).toEqual([
      { type: "lead", identifier: email, confidence: "probable", path: [profil] },
    ]);
    const city = ofType(events, "finding").find((e) => e.finding.field === "C1");
    expect(city?.finding.confidence).toBe("probable");
  });

  it("keeps the details of a leak infection and of a cited page in the finding event", async () => {
    const infection = { date: "2026-03-14", operatingSystem: "Windows 11", stolenCredentials: 12 };
    const page = { title: "Résultats 10 km" };
    const source = fake("a", ["EMAIL"], () => [
      record({
        fields: [
          { field: "H5", value: "2026-03-14", infection },
          { field: "I1", value: "https://club.exemple.ch/resultats", page },
        ],
      }),
    ]);
    const findings = ofType(await run([email], [source]), "finding").map((e) => e.finding);
    expect(findings.find((f) => f.field === "H5")?.infection).toEqual(infection);
    expect(findings.find((f) => f.field === "I1")?.page).toEqual(page);
  });

  it("skips a lead that was searched in the first round", async () => {
    const byEmail = fake("a", ["EMAIL"], () => [record({ identifiers: [tel] })]);
    const byTel = fake("b", ["TEL"], () => []);
    const events = await run([email], [byEmail, byTel], { alreadySearched: [tel] });
    expect(ofType(events, "lead")).toEqual([]);
    expect(byTel.investigate).not.toHaveBeenCalled();
  });

  describe("directory entries (T13)", () => {
    const address = { field: "B3" as const, value: "Rue du Lac 1, 2000 Neuchâtel" };
    const city = { field: "C1" as const, value: "Neuchâtel" };
    const byTel = (holder: string) =>
      fake("directory", ["TEL"], () => [
        record({ fields: [{ field: "A1", value: holder, holder: true }, address, city] }),
      ]);
    const pairs = (events: InvestigationEvent[]) =>
      ofType(events, "finding").map((e) => [e.finding.field, e.finding.value, e.finding.confidence]);

    it("keeps the name in A1 when the holder is the visitor", async () => {
      const events = await run([tel, name], [byTel("Léa Martin")]);
      expect(pairs(events)).toEqual([
        ["A1", "Léa Martin", "confirmed"],
        ["B3", address.value, "confirmed"],
        ["C1", "Neuchâtel", "confirmed"],
      ]);
      expect(ofType(events, "finding")[0]?.finding).not.toHaveProperty("holder");
    });

    it("moves the name of another holder to J1 and does not search again", async () => {
      const events = await run([tel, name], [byTel("Marc Martin")]);
      expect(pairs(events)).toEqual([
        ["B3", address.value, "confirmed"],
        ["C1", "Neuchâtel", "confirmed"],
        ["J1", "Marc Martin", "confirmed"],
      ]);
      expect(ofType(events, "lead")).toEqual([]);
    });

    it("puts the name in J1 when the visitor gave no name: it cannot be checked", async () => {
      const events = await run([tel], [byTel("Léa Martin")]);
      expect(pairs(events).map(([field]) => field)).toEqual(["B3", "C1", "J1"]);
    });

    const byName = (records: Partial<SourceRecord>[]) => fake("directory", ["NOM"], () => records.map(record));
    const person = (street: string) => ({
      homonyms: 2,
      fields: [
        { field: "A1" as const, value: "Léa Martin" },
        { field: "B3" as const, value: `${street}, 2000 Neuchâtel` },
        { field: "C1" as const, value: "Neuchâtel" },
      ],
    });

    it("gives one card per homonym when there are at most three", async () => {
      const events = await run([name], [byName([person("Rue du Lac 1"), person("Rue du Port 2")])]);
      const findings = ofType(events, "finding").map((e) => e.finding);
      expect(findings).toHaveLength(6);
      expect(findings.every((f) => f.confidence === "to_confirm")).toBe(true);
      expect(new Set(findings.slice(0, 3).map((f) => f.card)).size).toBe(1);
      expect(new Set(findings.slice(3).map((f) => f.card)).size).toBe(1);
      expect(findings[0]?.card).not.toBe(findings[3]?.card);
      expect(findings[0]?.card).toBeDefined();
    });

    it("counts the homonyms and shows nothing when there are too many", async () => {
      const events = await run([name], [byName([{ homonyms: 12, fields: [] }])]);
      expect(ofType(events, "finding")).toEqual([]);
      expect(ofType(events, "done")[0]?.hidden).toEqual({ possible: 0, namesake: 12 });
    });

    it("recognizes the visitor's own entry in a name search: confirmed, no card, no duplicate", async () => {
      const lookup = fake("phone", ["TEL"], () => [
        record({ fields: [{ field: "A1", value: "Léa Martin", holder: true }, address, city] }),
      ]);
      const directory = fake("names", ["NOM"], () => [
        record({ homonyms: 2, fields: [{ field: "A1", value: "Léa Martin" }, address, city] }),
        record({
          homonyms: 2,
          fields: [
            { field: "A1", value: "Léa Martin" },
            { field: "B3", value: "Bundesgasse 3, 3011 Bern" },
            { field: "C1", value: "Bern" },
          ],
        }),
      ]);
      const events = await run([tel, name], [lookup, directory]);
      // Last version of each finding, by card, field and value.
      const last = new Map(ofType(events, "finding").map((e) => [`${e.finding.card ?? ""}|${e.finding.field}|${e.finding.value}`, e.finding]));
      const own = [...last.values()].filter((f) => f.value === address.value || f.value === "Neuchâtel");
      expect(own.map((f) => [f.field, f.confidence, f.card, f.sources])).toEqual([
        ["B3", "confirmed", undefined, ["phone", "names"]],
        ["C1", "confirmed", undefined, ["phone", "names"]],
      ]);
      const bern = [...last.values()].filter((f) => f.confidence === "to_confirm");
      expect(bern.map((f) => f.field)).toEqual(["A1", "B3", "C1"]);
      expect(new Set(bern.map((f) => f.card)).size).toBe(1);
      expect(ofType(events, "done")[0]?.hidden).toEqual({ possible: 0, namesake: 0 });
    });

    it("keeps a stranger's entry a card, whatever hint it has", async () => {
      const confirmedCity = fake("phone", ["TEL"], () => [record({ fields: [city] })]);
      const directory = fake("names", ["NOM"], () => [
        record({ homonyms: 1, fields: [{ field: "A1", value: "Léa Martin" }, { field: "B3", value: "Bundesgasse 3, 3011 Bern" }, city] }),
      ]);
      const events = await run([tel, name], [confirmedCity, directory]);
      expect(ofType(events, "finding").filter((e) => e.finding.confidence === "to_confirm")).toHaveLength(3);
    });

    it("merges an account found as to confirm and as probable into one finding", async () => {
      const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };
      const url = "https://site-a.exemple.ch/lmartin_06";
      const sites = fake("sites", ["PSEUDO"], () => [record({ fields: [{ field: "F2", value: url }] })], { sitesChecked: 100 });
      const other = fake("other", ["PSEUDO"], () => [
        record({ fields: [{ field: "F2", value: url }, { field: "A1", value: "Léa Martin" }] }),
      ]);
      const events = await run([pseudo, name], [sites, other]);
      const accounts = ofType(events, "finding").filter((e) => e.finding.field === "F2");
      expect(accounts.at(-1)?.finding).toMatchObject({ confidence: "probable", sources: ["sites", "other"] });
    });

    it("sends nothing for a record to confirm that has no account address (T10)", async () => {
      const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };
      const sites = fake(
        "sites",
        ["PSEUDO"],
        () => [record({ fields: [{ field: "A1", value: "Paul Durand" }, { field: "B1", value: "paul@exemple.ch" }] })],
        { sitesChecked: 100 },
      );
      expect(ofType(await run([pseudo], [sites]), "finding")).toEqual([]);
    });

    it("gives an account to confirm a card and sends only its address (T10)", async () => {
      const pseudo: Identifier = { type: "PSEUDO", value: "lmartin_06" };
      const sites = fake(
        "sites",
        ["PSEUDO"],
        () => [
          record({
            fields: [
              { field: "F2", value: "https://site-a.exemple.ch/lmartin_06" },
              { field: "A1", value: "Paul Durand" },
            ],
          }),
        ],
        { sitesChecked: 100 },
      );
      const findings = ofType(await run([pseudo], [sites]), "finding").map((e) => e.finding);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ field: "F2", card: "F2:https://site-a.exemple.ch/lmartin_06" });
    });
  });

  it("ends with a done event", async () => {
    const events = await run([email], [fake("a", ["EMAIL"], () => [])]);
    expect(events).toEqual([{ type: "done", hidden: { possible: 0, namesake: 0 } }]);
  });
});
