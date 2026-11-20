import "server-only";
import { z } from "zod";
import type { FoundValue } from "@/server/domain/fiche";
import { FIELDS, type FieldCode } from "@/server/domain/fiche-fields";
import { fold, type Identifier } from "@/server/domain/identifier";

// Prototype (sandbox, D26): GPT-6.2 Astra reads the pages found by Tavily and
// fills fiche fields (city, school, employer, club…) that a fixed rule cannot read
// in free text. Three safeguards make an AI answer usable as a finding:
// - the model may only answer with a strict JSON schema limited to EXTRACTED_FIELDS;
// - each fact comes with a quote, kept only if it is really written on the page
//   (a model can invent, a quote check cannot);
// - extracted facts never create identifiers: the AI fills the fiche, it does not
//   decide where the investigation goes next.

export const ASTRA_MODEL = "gpt-6.2-astra";
const MODEL_LABEL = "GPT-6.2 Astra";

/** Fields the model may fill. Relatives (J1), contacts and breaches stay with the other sources. */
export const EXTRACTED_FIELDS = ["A2", "A4", "C1", "C2", "C3", "D1", "E1", "E3", "G1", "G2"] as const satisfies readonly FieldCode[];

/** Pages and characters per page sent to the model: keeps the cost near 0.2 USD per identifier (BUDGET.md). */
export const MAX_PAGES = 15;
const MAX_PAGE_CHARS = 2_500;
const MAX_VALUE_CHARS = 120;

const factSchema = z.object({
  field: z.enum(EXTRACTED_FIELDS),
  value: z.string(),
  quote: z.string(),
});
export type Fact = z.infer<typeof factSchema>;

const extractionSchema = z.object({
  pages: z.array(z.object({ index: z.number().int(), facts: z.array(factSchema) })),
});
export type PageFacts = z.infer<typeof extractionSchema>["pages"][number];

// Same shape as extractionSchema, written by hand in the subset that OpenAI's strict
// mode accepts: every property required, no other property allowed.
const strictObject = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const EXTRACTION_JSON_SCHEMA = strictObject({
  pages: {
    type: "array",
    items: strictObject({
      index: { type: "integer" },
      facts: {
        type: "array",
        items: strictObject({
          field: { type: "string", enum: EXTRACTED_FIELDS },
          value: { type: "string" },
          quote: { type: "string" },
        }),
      },
    }),
  },
});

// Raw shape of POST https://api.openai.com/v1/responses (only the fields we read).
const responseSchema = z.object({
  status: z.string(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }))
        .optional(),
    }),
  ),
});

export interface PageText {
  title: string;
  text: string;
}

const fieldList = EXTRACTED_FIELDS.map((code) => `${code}: ${FIELDS.find((f) => f.code === code)?.label}`).join("\n");

const INSTRUCTIONS = `You help a school awareness demo about online privacy. A volunteer typed their own
details and agreed to see what public web pages say about them. Read the numbered pages
and list the facts that each page states about this volunteer, for these fields only:
${fieldList}

Rules:
- Only facts about the volunteer, never about another person with the same name.
  If a page is about someone else or you are not sure, return no fact for it.
- "value" is short (a city, a school, a club, a job), written as on the page.
- "quote" is copied word for word from the page and contains the value.
- Never health, religion, politics, sexuality or ethnic origin.
- No fact is better than a guess.`;

/** Body of the Responses API call. `store: false`: OpenAI does not keep the volunteer's data. */
export function buildExtractionRequest(pages: readonly PageText[], person: Identifier) {
  const text = pages
    .map((page, index) => `[page ${index}] ${page.title}\n${page.text.slice(0, MAX_PAGE_CHARS)}`)
    .join("\n\n");
  return {
    model: ASTRA_MODEL,
    store: false,
    reasoning: { effort: "low" },
    max_output_tokens: 4_000,
    instructions: INSTRUCTIONS,
    input: [{ role: "user", content: `Volunteer: ${person.value}\n\n${text}` }],
    text: {
      format: {
        type: "json_schema",
        name: "page_facts",
        strict: true,
        schema: EXTRACTION_JSON_SCHEMA,
      },
    },
  };
}

/** Reads the model's answer. Errors are fixed strings: no page text or refusal text in the logs. */
export function readExtraction(body: unknown): PageFacts[] {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new Error("astra: invalid response");
  if (parsed.data.status !== "completed") throw new Error("astra: incomplete");
  const parts = parsed.data.output.filter((item) => item.type === "message").flatMap((item) => item.content ?? []);
  if (parts.some((part) => part.type === "refusal")) throw new Error("astra: refusal");
  const text = parts.find((part) => part.type === "output_text")?.text;
  if (!text) throw new Error("astra: invalid response");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("astra: invalid response");
  }
  const facts = extractionSchema.safeParse(json);
  if (!facts.success) throw new Error("astra: invalid response");
  return facts.data.pages;
}

/** The anti-invention check: the quote is on the page and the value is in the quote. */
export function toExtractedValues(facts: readonly Fact[], pageText: string): FoundValue[] {
  const page = fold(pageText);
  const values: FoundValue[] = [];
  for (const fact of facts) {
    const value = fact.value.trim();
    const quote = fold(fact.quote);
    if (!value || value.length > MAX_VALUE_CHARS || !quote) continue;
    if (!page.includes(quote) || !quote.includes(fold(value))) continue;
    values.push({
      field: fact.field,
      value,
      attributes: [
        { label: "Extrait", value: fact.quote.trim(), known: true },
        { label: "Lu par", value: MODEL_LABEL, known: true },
      ],
    });
  }
  return values;
}

/** One call for all the pages of an identifier. Returns the checked values, page by page. */
export async function extractFacts(
  pages: readonly PageText[],
  person: Identifier,
  { signal, apiKey }: { signal: AbortSignal; apiKey: string },
): Promise<FoundValue[][]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildExtractionRequest(pages, person)),
  });
  if (response.status === 429) throw new Error("astra: HTTP 429");
  if (!response.ok) throw new Error(`astra: HTTP ${response.status}`);
  const answer = readExtraction(await response.json());
  return pages.map((page, index) =>
    toExtractedValues(answer.find((p) => p.index === index)?.facts ?? [], `${page.title} ${page.text}`),
  );
}
