import { z } from "zod";

// First whitelist: score, favicon, images and ids are not declared. The page text (content) is
// read only to check that the page really cites the identifier; it never leaves the mapper.
export const tavilyResponseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      content: z.string().nullish(),
    }),
  ),
});

export type TavilyResponse = z.infer<typeof tavilyResponseSchema>;
