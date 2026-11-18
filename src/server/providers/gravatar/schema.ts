import { z } from "zod";

// First whitelist: z.object drops every key that is not declared here (bio, pronouns, images...).
const verifiedAccountSchema = z.object({
  url: z.string(),
  is_hidden: z.boolean(),
});

export const gravatarProfileSchema = z.object({
  display_name: z.string(),
  profile_url: z.string(),
  avatar_url: z.string(),
  location: z.string(),
  job_title: z.string(),
  company: z.string(),
  verified_accounts: z.array(verifiedAccountSchema),
});

export type GravatarProfile = z.infer<typeof gravatarProfileSchema>;
