import { z } from "zod";

/** One site of the WhatsMyName list. Only the keys used to check an account are declared. */
export const wmnSiteSchema = z.object({
  name: z.string(),
  /** Address called, with {account} in place of the pseudo. */
  uri_check: z.string(),
  /** Address of the profile for a person, when it differs from uri_check. */
  uri_pretty: z.string().optional(),
  e_code: z.number(),
  e_string: z.string(),
  m_code: z.number(),
  m_string: z.string(),
  cat: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  strip_bad_char: z.string().optional(),
  protection: z.array(z.string()).optional(),
  post_body: z.string().optional(),
  valid: z.boolean().optional(),
});

export const wmnDataSchema = z.object({ sites: z.array(wmnSiteSchema) });

export type WmnSite = z.infer<typeof wmnSiteSchema>;
