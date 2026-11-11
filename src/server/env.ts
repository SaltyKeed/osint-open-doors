import "server-only";
import { z } from "zod";

// Environment variables are external data: validated by zod once (D10, rule 1).
const envSchema = z.object({
  APP_MODE: z.enum(["surface", "deep"]).default("surface"),
  SEARCH_CH_API_KEY: z.string().min(1).optional(),
  TAVILY_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;
export type AppMode = Env["APP_MODE"];

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Only the names of the invalid variables are reported, never their values.
    const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${names}`);
  }
  cached = parsed.data;
  return cached;
}
