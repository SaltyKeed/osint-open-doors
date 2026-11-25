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

async function run(inputs: Identifier[], sources: Source[], options: { signal?: AbortSignal; callTimeoutMs?: number; alreadySearched?: Identifier[] } = {}) {
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

  it("skips a lead that was searched in the first round", async () => {
    const byEmail = fake("a", ["EMAIL"], () => [record({ identifiers: [tel] })]);
    const byTel = fake("b", ["TEL"], () => []);
    const events = await run([email], [byEmail, byTel], { alreadySearched: [tel] });
    expect(ofType(events, "lead")).toEqual([]);
    expect(byTel.investigate).not.toHaveBeenCalled();
  });

  it("ends with a done event", async () => {
    const events = await run([email], [fake("a", ["EMAIL"], () => [])]);
    expect(events).toEqual([{ type: "done", hidden: { possible: 0, namesake: 0 } }]);
  });
});
