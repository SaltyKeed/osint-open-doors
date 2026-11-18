import { describe, expect, it } from "vitest";
import { normalizeIdentifier, type IdentifierType } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";
import { ownDomain, toEmailDomainRecord } from "./emaildomain";
import { toKeybaseRecord } from "./keybase";
import { toOrcidRecords } from "./orcid";
import { analysePhone } from "./phone";
import { toRansomRecords } from "./ransomware";
import { rdapUrl, toRdapRecord } from "./rdap";
import { parseFeed, toDirectoryRecords } from "./searchch";
import { toShabRecords } from "./shab";
import { toWikidataRecords } from "./wikidata";

// All values below are invented test data.
const id = (type: IdentifierType, raw: string) => normalizeIdentifier(type, raw)!;
const values = (r: SourceRecord | undefined) => (r?.values ?? []).map((v) => `${v.field}=${v.value}`);
const ids = (r: SourceRecord | undefined) => (r?.identifiers ?? []).map((i) => `${i.identifier.type}:${i.identifier.value}`);

describe("email domain", () => {
  it("keeps personal and organisation domains, never shared mailbox providers", () => {
    expect(ownDomain("lea@leamartin.ch")).toBe("leamartin.ch");
    expect(ownDomain("lea@cpne.ch")).toBe("cpne.ch");
    expect(ownDomain("lea@hotmail.com")).toBeUndefined();
    expect(ownDomain("lea@bluewin.ch")).toBeUndefined();
  });

  it("gives the domain as a value and as a DOMAINE to pivot on", () => {
    const record = toEmailDomainRecord(id("EMAIL", "lea@leamartin.ch"));
    expect(values(record ?? undefined)).toEqual(["F3=leamartin.ch"]);
    expect(ids(record ?? undefined)).toEqual(["EMAIL:lea@leamartin.ch", "DOMAINE:leamartin.ch"]);
  });
});

describe("rdap", () => {
  const domain = id("DOMAINE", "leamartin.ch");
  const answer = (fn: string) => ({
    events: [{ eventAction: "registration", eventDate: "2019-05-02T00:00:00Z" }],
    entities: [{ roles: ["registrant"], vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", fn]]] }],
  });

  it("gives the registration year, and the holder when the register shows it", () => {
    const record = toRdapRecord(answer("Léa Martin"), domain);
    expect(values(record)).toEqual(["F3=leamartin.ch", "A1=Léa Martin"]);
    expect(record.values[0]?.attributes).toEqual([{ label: "Enregistré en", value: "2019", known: true }]);
  });

  it("asks the Swiss registry for .ch and .li domains, rdap.org for the others", () => {
    expect(rdapUrl("leamartin.ch")).toBe("https://rdap.nic.ch/domain/leamartin.ch");
    expect(rdapUrl("leamartin.li")).toBe("https://rdap.nic.ch/domain/leamartin.li");
    expect(rdapUrl("leamartin.com")).toBe("https://rdap.org/domain/leamartin.com");
  });

  it("never takes a hidden holder for a name", () => {
    expect(values(toRdapRecord(answer("REDACTED FOR PRIVACY"), domain))).toEqual(["F3=leamartin.ch"]);
  });
});

describe("ransomware.live", () => {
  it("keeps only the victims whose website is exactly the domain", () => {
    const records = toRansomRecords(
      [
        { victim: "École Exemple", domain: "www.ecole-exemple.ch", group: "lockbit", attackdate: "2025-03-14", discovered: "" },
        { victim: "Other", domain: "ecole-exemple.com", group: "x", attackdate: "2024-01-01", discovered: "" },
      ],
      id("DOMAINE", "ecole-exemple.ch"),
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.values[0]).toMatchObject({ field: "H1", value: "Rançongiciel : École Exemple" });
    expect(records[0]?.values[0]?.attributes).toContainEqual({ label: "Groupe", value: "lockbit", known: true });
  });
});

describe("keybase", () => {
  it("the account and the accounts it publicly proves are pivots", () => {
    const record = toKeybaseRecord(
      {
        them: [
          {
            basics: { username: "lmartin06" },
            proofs_summary: {
              all: [
                { proof_type: "github", nametag: "lmartin06" },
                { proof_type: "twitter", nametag: "lea_m" },
                { proof_type: "generic_web_site", nametag: "leamartin.ch" },
              ],
            },
          },
        ],
      },
      id("PSEUDO", "lmartin06"),
    );
    expect(values(record ?? undefined)).toEqual(["F2=https://keybase.io/lmartin06"]);
    expect(ids(record ?? undefined)).toEqual([
      "PROFIL:https://keybase.io/lmartin06",
      "PROFIL:https://github.com/lmartin06",
      "PROFIL:https://x.com/lea_m",
      "DOMAINE:leamartin.ch",
    ]);
  });

  it("no account, no record", () => {
    expect(toKeybaseRecord({ them: [null] }, id("PSEUDO", "nobody"))).toBeNull();
  });
});

describe("search.ch", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:openSearch="http://a9.com/-/spec/opensearchrss/1.0/" xmlns:tel="http://tel.search.ch/api/spec/result/1.0/">
  <openSearch:totalResults>2</openSearch:totalResults>
  <entry><tel:type>Person</tel:type><tel:name>Martin</tel:name><tel:firstname>Léa</tel:firstname><tel:street>Rue du Lac</tel:street><tel:streetno>12</tel:streetno><tel:zip>2000</tel:zip><tel:city>Neuchâtel</tel:city><tel:phone>+41791234567</tel:phone></entry>
  <entry><tel:type>Person</tel:type><tel:name>Autre</tel:name><tel:firstname>Paul</tel:firstname><tel:phone>+41790000000</tel:phone></entry>
</feed>`;

  it("keeps only listings that carry the searched number", () => {
    const feed = parseFeed(xml);
    const records = toDirectoryRecords(feed!, id("TEL", "079 123 45 67"));
    expect(records).toHaveLength(1);
    expect(values(records[0])).toEqual(["A1=Léa Martin", "B2=+41791234567", "B3=Rue du Lac 12, 2000 Neuchâtel", "C1=Neuchâtel"]);
    expect(ids(records[0])).toEqual(["TEL:+41791234567", "NOM:Léa Martin"]);
  });
});

describe("phone analysis", () => {
  it("gives the country and the kind of line, without any network call", () => {
    const record = analysePhone(id("TEL", "+41791234567"));
    expect(record?.values[0]).toEqual({
      field: "B2",
      value: "+41791234567",
      attributes: [
        { label: "Pays", value: "Suisse", known: true },
        { label: "Type de ligne", value: "mobile", known: true },
      ],
    });
  });
});

describe("orcid, wikidata, FOSC (found by name only)", () => {
  const name = id("NOM", "Léa Martin");

  it("orcid keeps the researchers with the full name", () => {
    const records = toOrcidRecords(
      {
        "expanded-result": [
          { "orcid-id": "0000-0001", "given-names": "Léa", "family-names": "Martin", "institution-name": ["Université de Neuchâtel"] },
          { "orcid-id": "0000-0002", "given-names": "Paul", "family-names": "Martin", "institution-name": [] },
        ],
      },
      name,
    );
    expect(records.map((r) => values(r))).toEqual([["E3=https://orcid.org/0000-0001", "E1=Université de Neuchâtel"]]);
  });

  it("wikidata keeps the items with the full name", () => {
    const records = toWikidataRecords(
      { search: [{ id: "Q1", label: "Léa Martin", description: "volleyeuse suisse" }, { id: "Q2", label: "Martin Luther", description: "" }] },
      name,
    );
    expect(records.map((r) => values(r))).toEqual([["I1=Léa Martin — volleyeuse suisse"]]);
  });

  it("FOSC keeps only commercial register publications", () => {
    const records = toShabRecords({
      content: [
        { meta: { id: "A1", rubric: "HR", publicationDate: "2024-02-01", cantons: ["NE"], title: { fr: "Martin Sàrl, Neuchâtel" } } },
        { meta: { id: "A2", rubric: "KK", publicationDate: "2024-03-01", cantons: [], title: { fr: "Faillite" } } },
      ],
    });
    expect(records.map((r) => values(r))).toEqual([["E2=Martin Sàrl, Neuchâtel"]]);
    expect(records[0]?.values[0]?.attributes).toContainEqual({ label: "Publication", value: "01.02.2024, canton NE", known: true });
  });
});
