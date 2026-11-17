import "server-only";
import { z } from "zod";

// Whitelist: zod drops every other field of the answer (contact_info, payments…).
export const gravatarProfileSchema = z.object({
  display_name: z.string().optional(),
  profile_url: z.string().optional(),
  avatar_url: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  job_title: z.string().optional(),
  company: z.string().optional(),
  verified_accounts: z
    .array(z.object({ service_label: z.string(), url: z.string(), is_hidden: z.boolean().optional() }))
    .optional(),
});

export type GravatarProfile = z.infer<typeof gravatarProfileSchema>;
