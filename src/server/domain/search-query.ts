import "server-only";
import { z } from "zod";
import type { QueryKind, SearchQuery } from "./types";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Returns the number as +41XXXXXXXXX, or null if it is not a Swiss number. */
export function normalizeSwissPhone(value: string): string | null {
  const compact = value
    .replace(/[\s.\-()]/g, "")
    .replace(/^0041/, "+41")
    .replace(/^0(\d{9})$/, "+41$1");
  return /^\+41\d{9}$/.test(compact) ? compact : null;
}

const KIND_ORDER: readonly QueryKind[] = ["email", "phone", "name"];

export function queryKinds(query: SearchQuery): QueryKind[] {
  return KIND_ORDER.filter((kind) => query[kind] !== undefined);
}

const nameField = z.string().trim().min(1).optional();

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
    firstName: nameField,
    lastName: nameField,
    consent: z.literal(true),
  })
  .refine((r) => (r.firstName === undefined) === (r.lastName === undefined), {
    message: "First name and last name go together",
    path: ["firstName"],
  })
  .refine((r) => r.email !== undefined || r.phone !== undefined || r.firstName !== undefined, {
    message: "At least one identifier is required",
  })
  .transform((r): SearchQuery => ({
    ...(r.email !== undefined && { email: r.email }),
    ...(r.phone !== undefined && { phone: r.phone }),
    ...(r.firstName !== undefined && r.lastName !== undefined && {
      name: { first: r.firstName, last: r.lastName },
    }),
  }));
