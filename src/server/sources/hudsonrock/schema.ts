import "server-only";
import { z } from "zod";

// Whitelist: computer_name, ip, top_passwords, top_logins and malware_path are dropped here.
export const hudsonRockSchema = z.object({
  stealers: z
    .array(
      z.object({
        date_compromised: z.string().nullable().optional(),
        operating_system: z.string().nullable().optional(),
        total_user_services: z.number().nullable().optional(),
        total_corporate_services: z.number().nullable().optional(),
        antiviruses: z.union([z.array(z.string()), z.string()]).nullable().optional(),
      }),
    )
    .default([]),
});

export type HudsonRockAnswer = z.infer<typeof hudsonRockSchema>;
