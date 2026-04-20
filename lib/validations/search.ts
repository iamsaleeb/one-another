import { z } from "zod";

export const searchParamsSchema = z.object({
  q: z.string().optional(),
  type: z.enum(["all", "events", "churches"]).default("all"),
  when: z.enum(["today", "tomorrow", "weekend"]).optional(),
  category: z.string().optional(),
});

export type ParsedSearchParams = z.infer<typeof searchParamsSchema>;
