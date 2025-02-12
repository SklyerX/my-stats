import { z } from "zod";

export const topStatsSchema = z.object({
  slug: z.enum(["artists", "tracks", "albums"]),
  timeRange: z.enum(["short", "medium", "long"]).optional().default("medium"),
  limit: z.number().min(1).max(50).optional().default(20),
});
