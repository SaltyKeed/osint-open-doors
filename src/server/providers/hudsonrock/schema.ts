import { z } from "zod";

// First whitelist: computer name, IP, malware path, antivirus, logins and passwords are not declared,
// so they do not exist after parsing.
const stealerSchema = z.object({
  date_compromised: z.string().nullish(),
  operating_system: z.string().nullish(),
  total_user_services: z.number().nullish(),
  total_corporate_services: z.number().nullish(),
});

export const hudsonRockResponseSchema = z.object({
  stealers: z.array(stealerSchema),
});

export type HudsonRockResponse = z.infer<typeof hudsonRockResponseSchema>;
