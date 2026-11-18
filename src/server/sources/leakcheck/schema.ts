import "server-only";
import { z } from "zod";

// Public API (no key): breach names and dates, and the list of data types found.
// The records themselves (passwords, addresses) need the paid Pro API.
export const leakCheckPublicSchema = z.object({
  success: z.boolean(),
  found: z.number().optional(),
  fields: z.array(z.string()).optional(),
  sources: z.array(z.object({ name: z.string(), date: z.string().optional() })).optional(),
});

export type LeakCheckPublic = z.infer<typeof leakCheckPublicSchema>;
