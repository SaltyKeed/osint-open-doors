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
