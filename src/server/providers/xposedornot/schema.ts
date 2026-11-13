import { z } from "zod";

// First whitelist: z.object drops every key that is not declared here.
const breachSchema = z.object({
  breach: z.string(),
  domain: z.string(),
  xposed_data: z.string(),
  xposed_date: z.string(),
  xposed_records: z.number().nullable().optional(),
  verified: z.union([z.boolean(), z.enum(["Yes", "No"])]),
});

export const xonResponseSchema = z.object({
  ExposedBreaches: z.object({ breaches_details: z.array(breachSchema) }).nullable(),
});

export type XonResponse = z.infer<typeof xonResponseSchema>;
