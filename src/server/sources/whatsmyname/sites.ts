import "server-only";
import { z } from "zod";
import file from "./wmn-sites.json";

// Frozen copy of the WhatsMyName list (SOURCES.md, section 3.1; CC BY-SA 4.0):
// for each site, the profile address and how to tell "account exists" from "no
// account". The upstream project is archived, so the list lives in the repository.
const siteSchema = z.object({
  name: z.string(),
  uri_check: z.string(),
  uri_pretty: z.string().optional(),
  e_code: z.number(),
  e_string: z.string(),
  m_code: z.number(),
  m_string: z.string(),
  cat: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  strip_bad_char: z.string().optional(),
});

export type WmnSite = z.infer<typeof siteSchema>;

let cache: WmnSite[] | undefined;

/** Sites that do not match the schema are left out instead of failing the search. */
export function loadSites(): WmnSite[] {
  cache ??= file.sites.flatMap((s: unknown) => {
    const parsed = siteSchema.safeParse(s);
    return parsed.success ? [parsed.data] : [];
  });
  return cache;
}
