import { describe, expect, it, vi } from "vitest";
import { normalizeIdentifier, type Identifier, type IdentifierType } from "@/server/domain/identifier";
import { inputLead } from "@/server/domain/lead";
import type { Source, SourceRecord, SourceResult } from "@/server/domain/source";
import { investigate } from "./engine";

// All values below are invented test data.
const id = (type: IdentifierType, raw: string) => normalizeIdentifier(type, raw)!;
const context = { locality: null, birthYear: null };
const env = {};

function fake(
  sourceId: string,
  accepts: IdentifierType[],
  answer: (identifier: Identifier) => SourceRecord[] | Error,
  requiredEnv: string[] = [],
): Source & { calls: string[] } {
  const calls: string[] = [];
  return {
    id: sourceId,
    label: sourceId,
    accepts,
    requiredEnv,
    calls,
    run: vi.fn(async (identifier: Identifier): Promise<SourceResult> => {
      calls.push(identifier.value);
      const records = answer(identifier);
      if (records instanceof Error) throw records;
      return records.length > 0 ? { status: "found", records } : { status: "not_found", records: [] };
    }),
  };
}

const email = id("EMAIL", "lea@example.ch");

describe("investigate", () => {
  it("puts the input in the fiche as confirmed", async () => {
    const { fiche } = await investigate([inputLead(email)], context, [], { env });
    expect([...fiche.values()]).toMatchObject([{ field: "B1", value: "lea@example.ch", confidence: "confirme" }]);
  });

  it("pivots on a confirmed identifier found by a source", async () => {
    const byEmail = fake("mail-source", ["EMAIL"], () => [
      {
        origin: "mail-source",
        evidence: null,
        values: [{ field: "F1", value: "lmartin06" }],
        identifiers: [{ identifier: id("PSEUDO", "lmartin06") }],
      },
    ]);
    const byPseudo = fake("pseudo-source", ["PSEUDO"], () => [
      { origin: "pseudo-source", evidence: null, values: [{ field: "C1", value: "Neuchâtel" }], identifiers: [] },
    ]);
    const { fiche } = await investigate([inputLead(email)], context, [byEmail, byPseudo], { env });
    expect(byPseudo.calls).toEqual(["lmartin06"]);
    const city = [...fiche.values()].find((f) => f.field === "C1");
    // Found from a confirmed pseudo, without hint: a pseudo alone stays possible.
    expect(city?.confidence).toBe("possible");
    expect(city?.sightings[0]?.path.map((s) => s.sourceId)).toEqual(["saisie", "mail-source"]);
  });

  it("never queries the same identifier twice", async () => {
    const loop = fake("loop", ["EMAIL"], () => [
      { origin: "loop", evidence: null, values: [], identifiers: [{ identifier: email }] },
    ]);
    await investigate([inputLead(email), inputLead(email)], context, [loop], { env });
    expect(loop.calls).toEqual(["lea@example.ch"]);
  });

  it("never investigates relatives", async () => {
    const withFriend = fake("friends", ["EMAIL"], () => [
      {
        origin: "friends",
        evidence: null,
        values: [{ field: "J1", value: "Paul Martin", thirdParty: true }],
        identifiers: [{ identifier: id("PSEUDO", "pmartin77"), thirdParty: true }],
      },
    ]);
    const byPseudo = fake("pseudo-source", ["PSEUDO"], () => []);
    const { fiche } = await investigate([inputLead(email)], context, [withFriend, byPseudo], { env });
    expect(byPseudo.calls).toEqual([]);
    expect([...fiche.values()].find((f) => f.field === "J1")?.thirdParty).toBe(true);
  });

  it("a name alone gives namesakes, which never relaunch", async () => {
    const byName = fake("name-source", ["NOM"], () => [
      {
        origin: "registry",
        evidence: null,
        values: [{ field: "B2", value: "079 999 99 99" }],
        identifiers: [{ identifier: id("TEL", "079 999 99 99") }],
      },
    ]);
    const byPhone = fake("phone-source", ["TEL"], () => []);
    const { fiche } = await investigate([inputLead(id("NOM", "Léa Martin"))], context, [byName, byPhone], { env });
    expect(byPhone.calls).toEqual([]);
    expect([...fiche.values()].find((f) => f.field === "B2")?.confidence).toBe("homonyme");
  });

  it("a record holding a confirmed email confirms what it contains", async () => {
    const byName = fake("name-source", ["NOM"], () => [
      {
        origin: "leak",
        evidence: null,
        values: [{ field: "B2", value: "079 123 45 67" }],
        identifiers: [{ identifier: email }, { identifier: id("TEL", "079 123 45 67") }],
      },
    ]);
    const leads = [inputLead(email), inputLead(id("NOM", "Léa Martin"))];
    const { fiche } = await investigate(leads, context, [byName], { env });
    expect([...fiche.values()].find((f) => f.field === "B2")?.confidence).toBe("confirme");
  });

  it("a failing source or a missing key does not stop the investigation", async () => {
    const broken = fake("broken", ["EMAIL"], () => new Error("broken: HTTP 500"));
    const limited = fake("limited", ["EMAIL"], () => new Error("limited: HTTP 429"));
    const locked = fake("locked", ["EMAIL"], () => [], ["LOCKED_API_KEY"]);
    const working = fake("working", ["EMAIL"], () => [
      { origin: "working", evidence: null, values: [{ field: "A1", value: "Léa Martin" }], identifiers: [] },
    ]);
    const { runs, fiche } = await investigate([inputLead(email)], context, [broken, limited, locked, working], { env });
    expect(locked.calls).toEqual([]);
    expect(runs.map((r) => [r.sourceId, r.status, r.records])).toEqual([
      ["broken", "error", 0],
      ["limited", "quota", 0],
      ["locked", "no_key", 0],
      ["working", "found", 1],
    ]);
    expect([...fiche.values()].some((f) => f.field === "A1")).toBe(true);
  });
});
