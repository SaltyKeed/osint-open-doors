import "server-only";
import { z } from "zod";

/** "KEY=" in .env.local means no key: the source works without it or is skipped (T3). */
const optionalKey = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined)
  .pipe(z.string().regex(/^[\w-]+$/).optional());

const envSchema = z.object({
  /** Token without any permission: raises the GitHub quota, optional. */
  GITHUB_TOKEN: optionalKey,
});

export type Env = z.infer<typeof envSchema>;

/** The only place that reads process.env (keys stay on the server). */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Only the variable names: a value could be a secret such as an API key.
    const names = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`Invalid environment: ${names.join(", ")}`);
  }
  // Leave out absent keys, so that the result lists only what is configured.
  return Object.fromEntries(Object.entries(result.data).filter(([, value]) => value !== undefined)) as Env;
}
