import type { Album, SimplifiedArtist } from "@/types/spotify";
import { z } from "zod";

export const topStatsSchema = z.object({
  slug: z.string(),
  time_range: z
    .enum(["short_term", "medium_term", "long_term"])
    .nullable()
    .default("short_term"),
  limit: z.number().min(1).max(50).nullable().default(50),
  offset: z.number().min(0).max(50).nullable().default(0),
});

export interface RecentlyPlayed {
  name: string;
  artists: SimplifiedArtist[];
  album: Album;
  id: string;
  playedAt: string;
}
