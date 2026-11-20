import { describe, expect, it } from "vitest";
import { normalizeIdentifier } from "@/server/domain/identifier";
import { buildExtractionRequest, readExtraction, toExtractedValues } from "./extract";

// All values below are invented test data.
const lea = normalizeIdentifier("NOM", "Léa Martin")!;
const page = "Léa Martin, 17 ans, joue au VBC Colombier depuis 2021. Elle étudie au CPNE à Neuchâtel.";

describe("toExtractedValues", () => {
  it("keeps a fact whose quote is really written on the page, with the quote as proof", () => {
    const values = toExtractedValues(
      [{ field: "G1", value: "VBC Colombier", quote: "joue au VBC Colombier depuis 2021" }],
      page,
    );
    expect(values).toEqual([
      {
        field: "G1",
        value: "VBC Colombier",
        attributes: [
          { label: "Extrait", value: "joue au VBC Colombier depuis 2021", known: true },
          { label: "Lu par", value: "GPT-6.2 Astra", known: true },
        ],
      },
    ]);
  });

  it("ignores case, accents and spaces when it checks the quote", () => {
    const values = toExtractedValues(
      [{ field: "D1", value: "CPNE", quote: "elle  ETUDIE au cpne a neuchatel" }],
      page,
    );
    expect(values).toHaveLength(1);
  });

  it("drops a fact whose quote is not on the page (invented by the model)", () => {
    const values = toExtractedValues(
      [{ field: "E1", value: "Migros", quote: "travaille chez Migros" }],
      page,
    );
    expect(values).toEqual([]);
  });

  it("drops a fact whose value is not in its quote", () => {
    const values = toExtractedValues([{ field: "C1", value: "Lausanne", quote: "étudie au CPNE à Neuchâtel" }], page);
    expect(values).toEqual([]);
  });

  it("drops empty values and too long values", () => {
    const values = toExtractedValues(
      [
        { field: "G2", value: " ", quote: "joue au VBC Colombier" },
        { field: "G2", value: "x".repeat(200), quote: "joue au VBC Colombier" },
      ],
      page,
    );
    expect(values).toEqual([]);
  });

  it("keeps the age as it is written on the page", () => {
    const values = toExtractedValues([{ field: "A2", value: "17 ans", quote: "Léa Martin, 17 ans" }], page);
    expect(values.map((v) => v.value)).toEqual(["17 ans"]);
  });
});

describe("buildExtractionRequest", () => {
  const body = buildExtractionRequest([{ title: "Club", text: page }], lea);

  it("never lets OpenAI keep the request", () => {
    expect(body.store).toBe(false);
  });

  it("asks for a strict JSON schema limited to the allowed fields", () => {
    const format = body.text.format;
    expect(format.strict).toBe(true);
    expect(JSON.stringify(format.schema)).not.toContain("J1");
    expect(JSON.stringify(format.schema)).toContain("C1");
  });

  it("names the person and numbers the pages", () => {
    const user = JSON.stringify(body.input);
    expect(user).toContain("Léa Martin");
    expect(user).toContain("[page 0]");
  });

  it("cuts long pages", () => {
    const long = buildExtractionRequest([{ title: "Long", text: "a".repeat(50_000) }], lea);
    expect(JSON.stringify(long.input).length).toBeLessThan(10_000);
  });
});

describe("readExtraction", () => {
  const answer = (content: unknown[], status = "completed") => ({
    status,
    output: [{ type: "reasoning" }, { type: "message", role: "assistant", content }],
  });
  const json = JSON.stringify({ pages: [{ index: 0, facts: [{ field: "G1", value: "VBC Colombier", quote: "VBC Colombier" }] }] });

  it("reads the JSON of the assistant message", () => {
    expect(readExtraction(answer([{ type: "output_text", text: json }]))).toEqual([
      { index: 0, facts: [{ field: "G1", value: "VBC Colombier", quote: "VBC Colombier" }] },
    ]);
  });

  it("fails without the refusal text when the model refuses", () => {
    expect(() => readExtraction(answer([{ type: "refusal", refusal: "Je ne peux pas aider à enquêter sur Léa." }]))).toThrow(
      /^astra: refusal$/,
    );
  });

  it("fails when the answer is incomplete", () => {
    expect(() => readExtraction(answer([{ type: "output_text", text: "{" }], "incomplete"))).toThrow(/^astra: incomplete$/);
  });

  it("fails on a field outside the list", () => {
    const bad = JSON.stringify({ pages: [{ index: 0, facts: [{ field: "J1", value: "Paul", quote: "Paul" }] }] });
    expect(() => readExtraction(answer([{ type: "output_text", text: bad }]))).toThrow(/^astra: invalid response$/);
  });
});
