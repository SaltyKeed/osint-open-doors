import "server-only";
import { z } from "zod";

const text = z.string().nullable().optional();

export const githubUserSchema = z.object({
  login: z.string(),
  html_url: z.string(),
  avatar_url: text,
  name: text,
  company: text,
  blog: text,
  location: text,
  email: text,
  bio: text,
  twitter_username: text,
  public_repos: z.number().optional(),
  followers: z.number().optional(),
  created_at: text,
});

export type GithubUser = z.infer<typeof githubUserSchema>;

export const githubCommitSearchSchema = z.object({
  items: z.array(
    z.object({
      author: z.object({ login: z.string() }).nullable(),
      commit: z.object({ author: z.object({ name: z.string() }).nullable() }),
      repository: z.object({ full_name: z.string() }),
    }),
  ),
});

export type GithubCommitSearch = z.infer<typeof githubCommitSearchSchema>;
