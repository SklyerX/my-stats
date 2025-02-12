import { z } from "zod";

export const topStatsSchema = z.object({
  time_range: z
    .enum(["short_term", "medium_term", "long_term"])
    .nullable()
    .default("short_term"),
  limit: z.number().min(1).max(50).nullable().default(50),
  offset: z.number().min(1).max(50).nullable().default(50),
});
