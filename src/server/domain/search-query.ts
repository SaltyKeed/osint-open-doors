import "server-only";
import { z } from "zod";
import type { Identifier } from "./identifier";
import type { SearchQuery } from "./types";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// Letters, digits, dot, dash, underscore, with at least one letter or digit: the pseudo is put in
// the URL of 569 sites (T7), where ".." would point to the parent page.
const PSEUDO = /^(?=.*[a-z0-9])[a-z0-9._-]{1,40}$/;

/** "@LMartin_06" becomes "lmartin_06". Returns null when the pseudo has another character or is too long. */
export function normalizePseudo(value: string): string | null {
  const pseudo = value.trim().replace(/^@/, "").toLowerCase();
  return PSEUDO.test(pseudo) ? pseudo : null;
}

/** Returns the number as +41XXXXXXXXX, or null if it is not a Swiss number. */
export function normalizeSwissPhone(value: string): string | null {
  const compact = value
    .replace(/[\s.\-()]/g, "")
    .replace(/^0041/, "+41")
    .replace(/^0(\d{9})$/, "+41$1");
  return /^\+41\d{9}$/.test(compact) ? compact : null;
}

/** The visitor's input as identifiers, already normalized by the request schema. */
export function queryIdentifiers(query: SearchQuery): Identifier[] {
  return [
    ...(query.email !== undefined ? [{ type: "EMAIL" as const, value: query.email }] : []),
    ...(query.phone !== undefined ? [{ type: "TEL" as const, value: query.phone }] : []),
    ...(query.pseudo !== undefined ? [{ type: "PSEUDO" as const, value: query.pseudo }] : []),
    ...(query.name !== undefined ? [{ type: "NOM" as const, value: `${query.name.first} ${query.name.last}` }] : []),
  ];
}

// Repeated spaces collapsed: the name gets the same key here and in normalizeIdentifier (second round, T9).
const nameField = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.replace(/\s+/g, " "))
  .optional();

export const searchRequestSchema = z
  .object({
    email: z.string().transform(normalizeEmail).pipe(z.email()).optional(),
    phone: z
      .string()
      .transform((value, ctx) => {
        const phone = normalizeSwissPhone(value);
        if (phone === null) {
          // No input in the message: it would be the visitor's phone number.
          ctx.addIssue({ code: "custom", message: "Invalid Swiss phone number" });
          return z.NEVER;
        }
        return phone;
      })
      .optional(),
    pseudo: z
      .string()
      .transform((value, ctx) => {
        const pseudo = normalizePseudo(value);
        if (pseudo === null) {
          ctx.addIssue({ code: "custom", message: "Invalid pseudo" });
          return z.NEVER;
        }
        return pseudo;
      })
      .optional(),
    firstName: nameField,
    lastName: nameField,
    consent: z.literal(true),
  })
  .refine((r) => (r.firstName === undefined) === (r.lastName === undefined), {
    message: "First name and last name go together",
    path: ["firstName"],
  })
  .refine((r) => r.email !== undefined || r.phone !== undefined || r.pseudo !== undefined || r.firstName !== undefined, {
    message: "At least one identifier is required",
  })
  .transform((r): SearchQuery => ({
    ...(r.email !== undefined && { email: r.email }),
    ...(r.phone !== undefined && { phone: r.phone }),
    ...(r.pseudo !== undefined && { pseudo: r.pseudo }),
    ...(r.firstName !== undefined && r.lastName !== undefined && {
      name: { first: r.firstName, last: r.lastName },
    }),
  }));
