import type { InternalTopUserStats } from "@/types/response";
import { CACHE_KEYS, CACHE_TIMES } from "../constants";
import { redis } from "../redis";
import { getValidSpotifyToken } from "./tokens";
import { TopStatsAnalyzer } from "./top-stats-analyzer";
import { processArtistTask } from "@/trigger/process-artist";
import type { TIME_RANGE } from "@/types/spotify";
import type { User } from "@workspace/database/schema";

export async function getUserTopStats(
  user: User,
  timeRange: TIME_RANGE = "short_term",
  limit = 50,
  offset = 0,
  albumLimit = 50,
) {
  const cacheKey = CACHE_KEYS.top(user.spotifyId, timeRange);
  const cached = await redis.get(cacheKey);

  if (cached) {
    return {
      stats: cached,
      user: {
        image: user.image,
        name: user.username,
        bio: user.bio,
        id: user.id,
      },
    } as InternalTopUserStats;
  }

  const accessToken = await getValidSpotifyToken(user.id);

  const analyzer = new TopStatsAnalyzer(accessToken, user.spotifyId);

  const stats = await analyzer.getStatistics(
    timeRange,
    limit,
    offset,
    albumLimit,
  );

  await processArtistTask.trigger({
    artists: stats.artists,
    accessToken,
  });

  await redis.set(cacheKey, stats, {
    ex: CACHE_TIMES[timeRange],
  });

  return {
    stats,
    user: {
      image: user.image,
      name: user.username,
      bio: user.bio,
      id: user.id,
      flags: user.flags,
    },
  } as InternalTopUserStats;
}
