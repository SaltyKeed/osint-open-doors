import "server-only";
import { z } from "zod";

// Shape of POST https://api.tavily.com/search (only the fields we use).
export const tavilyResponseSchema = z.object({
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string().default(""),
      content: z.string().default(""),
    }),
  ),
});

export type TavilyResult = z.infer<typeof tavilyResponseSchema>["results"][number];
