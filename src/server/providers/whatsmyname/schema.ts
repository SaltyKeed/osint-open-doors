import "server-only";
import { z } from "zod";

// WhatsMyName dataset (github.com/WebBreacher/WhatsMyName, CC BY-SA 4.0).
// For each site: the profile URL and how to tell "account exists" from "no account".
const siteSchema = z.object({
  name: z.string(),
  uri_check: z.string(),
  uri_pretty: z.string().optional(),
  e_code: z.number(),
  e_string: z.string(),
  m_code: z.number(),
  m_string: z.string(),
  cat: z.string(),
  post_body: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  strip_bad_char: z.string().optional(),
  valid: z.boolean().optional(),
});

export const datasetSchema = z.object({ sites: z.array(z.unknown()) });
export { siteSchema };

export type WmnSite = z.infer<typeof siteSchema>;
