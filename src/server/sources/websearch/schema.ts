import "server-only";
import { z } from "zod";

// Shape of POST https://api.tavily.com/search (only the fields we use).
export const tavilyResponseSchema = z.object({
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string().default(""),
      content: z.string().default(""),
      // Full page text: used only to check that the page names the person, never kept.
      raw_content: z.string().nullish(),
    }),
  ),
});

export type TavilyResponse = z.infer<typeof tavilyResponseSchema>;
