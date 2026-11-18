import "server-only";
import { z } from "zod";

// "message" is an object { breach name: records } on success, a text on error.
// With the public key the records are empty arrays: only the names are kept.
export const leakLookupSchema = z.object({
  error: z.string(),
  message: z.union([z.string(), z.record(z.string(), z.unknown())]),
});

export type LeakLookupAnswer = z.infer<typeof leakLookupSchema>;
