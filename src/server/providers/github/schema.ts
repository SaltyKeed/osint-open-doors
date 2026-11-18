import { z } from "zod";

// First whitelist: bio, commit messages, counters and ids are not declared, so they disappear.
export const githubUserSchema = z.object({
  login: z.string(),
  avatar_url: z.string(),
  html_url: z.string(),
  name: z.string().nullish(),
  company: z.string().nullish(),
  blog: z.string().nullish(),
  location: z.string().nullish(),
  email: z.string().nullish(),
  twitter_username: z.string().nullish(),
});

export const githubCommitsSchema = z.object({
  items: z.array(
    z.object({
      commit: z.object({ author: z.object({ name: z.string() }).nullish() }),
      /** null when the email is not linked to a GitHub account. */
      author: z.object({ login: z.string() }).nullish(),
      repository: z.object({ full_name: z.string() }),
    }),
  ),
});

export type GithubUser = z.infer<typeof githubUserSchema>;
export type GithubCommits = z.infer<typeof githubCommitsSchema>;
