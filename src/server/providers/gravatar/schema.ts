import "server-only";
import { z } from "zod";

// Shape of GET https://api.gravatar.com/v3/profiles/{sha256} (public profile, fields we use).
export const gravatarProfileSchema = z.object({
  display_name: z.string().nullish(),
  location: z.string().nullish(),
  job_title: z.string().nullish(),
  company: z.string().nullish(),
  description: z.string().nullish(),
  verified_accounts: z
    .array(
      z.object({
        service_label: z.string().nullish(),
        url: z.string().nullish(),
        is_hidden: z.boolean().nullish(),
      }),
    )
    .nullish(),
});

export type GravatarProfile = z.infer<typeof gravatarProfileSchema>;
