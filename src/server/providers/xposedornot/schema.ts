import "server-only";
import { z } from "zod";

// Shape of GET https://api.xposedornot.com/v1/breach-analytics?email=...
// Only the fields we use are declared: zod drops every other field.
const breachDetailSchema = z.object({
  breach: z.string(),
  domain: z.string().optional(),
  xposed_data: z.string().default(""),
  xposed_date: z.string().optional(),
  xposed_records: z.number().optional(),
});

export const breachAnalyticsSchema = z.object({
  // null when the email appears in no known breach.
  ExposedBreaches: z
    .object({ breaches_details: z.array(breachDetailSchema) })
    .nullable(),
  // Pastes: texts published on Pastebin-like sites that contain the email.
  PastesSummary: z.object({ cnt: z.coerce.number() }).nullish(),
});

export type BreachAnalyticsResponse = z.infer<typeof breachAnalyticsSchema>;
