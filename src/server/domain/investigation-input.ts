import "server-only";
import { z } from "zod";
import { normalizeIdentifier, type Identifier, type IdentifierType } from "./identifier";
import { inputLead, type Lead } from "./lead";

// Error messages are fixed: a refused value is never copied into them.
const identifierField = (type: IdentifierType) =>
  z
    .string()
    .transform((raw, ctx) => {
      const identifier = normalizeIdentifier(type, raw);
      if (identifier === null) {
        ctx.addIssue({ code: "custom", message: `Invalid ${type}` });
        return z.NEVER;
      }
      return identifier;
    })
    .optional();

const text = z.string().trim().min(1).max(100).optional();

export const investigationInputSchema = z
  .object({
    email: identifierField("EMAIL"),
    phone: identifierField("TEL"),
    pseudo: identifierField("PSEUDO"),
    firstName: text,
    lastName: text,
    locality: text,
    birthDate: z.iso.date().optional(),
    consent: z.literal(true),
  })
  .refine((r) => (r.firstName === undefined) === (r.lastName === undefined), {
    message: "First name and last name go together",
    path: ["firstName"],
  })
  .refine((r) => [r.email, r.phone, r.pseudo, r.firstName].some((v) => v !== undefined), {
    message: "At least one identifier is required",
  });

export type InvestigationInput = z.infer<typeof investigationInputSchema>;

export interface InvestigationContext {
  locality: string | null;
  birthYear: number | null;
}

/** Each input becomes a level-0 lead; locality and birth date only help to rate findings. */
export function toInitialLeads(input: InvestigationInput): { leads: Lead[]; context: InvestigationContext } {
  const name =
    input.firstName && input.lastName ? normalizeIdentifier("NOM", `${input.firstName} ${input.lastName}`) : null;
  const identifiers = [input.email, input.phone, input.pseudo, name].filter(
    (i): i is Identifier => i !== undefined && i !== null,
  );
  return {
    leads: identifiers.map(inputLead),
    context: {
      locality: input.locality ?? null,
      birthYear: input.birthDate ? Number(input.birthDate.slice(0, 4)) : null,
    },
  };
}
