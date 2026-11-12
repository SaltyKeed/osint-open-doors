import "server-only";
import { z } from "zod";

const envSchema = z.object({
  APP_MODE: z.enum(["surface", "deep"]).default("surface"),
});

export type Env = z.infer<typeof envSchema>;
export type AppMode = Env["APP_MODE"];

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Only the variable names: a value could be a secret such as an API key.
    const names = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`Invalid environment: ${names.join(", ")}`);
  }
  return result.data;
}
