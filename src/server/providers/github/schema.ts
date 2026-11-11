import "server-only";
import { z } from "zod";

// Shape of GET https://api.github.com/search/commits?q=author-email:...
export const commitSearchSchema = z.object({
  total_count: z.number(),
  items: z.array(
    z.object({
      commit: z.object({ author: z.object({ email: z.string() }).nullable() }),
      author: z.object({ login: z.string() }).nullable(),
      repository: z.object({ full_name: z.string() }),
    }),
  ),
});

export type CommitSearch = z.infer<typeof commitSearchSchema>;

// Shape of GET https://api.github.com/users/{login} (public profile, fields we use).
export const userSchema = z.object({
  login: z.string(),
  name: z.string().nullish(),
  company: z.string().nullish(),
  blog: z.string().nullish(),
  location: z.string().nullish(),
  bio: z.string().nullish(),
  twitter_username: z.string().nullish(),
  public_repos: z.number().optional(),
  created_at: z.string().optional(),
});

export type GitHubUser = z.infer<typeof userSchema>;
