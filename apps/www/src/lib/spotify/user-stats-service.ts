import type { InternalTopUserStats } from "@/types/response";
import { CACHE_KEYS, CACHE_TIMES } from "../constants";
import { redis } from "../redis";
import { getValidSpotifyToken } from "./tokens";
import { TopStatsAnalyzer } from "./top-stats-analyzer";
import { processArtistTask } from "@/trigger/process-artist";
import type {
  Album,
  Artist,
  StatsResponse,
  TIME_RANGE,
  Track,
} from "@/types/spotify";
import type { User } from "@workspace/database/schema";
import { hasPrivacyFlag, PRIVACY_FLAGS } from "../flags";

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
        flags: user.flags,
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

export type StatsField = "tracks" | "albums" | "artists" | "genres";

export async function getUserTopStatsWithFieldsAndPrivacy(
  user: User,
  flags: number,
  fields: StatsField[] = ["tracks", "albums", "artists", "genres"],
  timeRange: TIME_RANGE = "short_term",
  limit = 50,
  offset = 0,
  albumLimit = 50,
) {
  const result = await getUserTopStats(
    user,
    timeRange,
    limit,
    offset,
    albumLimit,
  );

  const privacySettings = {
    tracks: Boolean(flags && hasPrivacyFlag(flags, PRIVACY_FLAGS.TOP_TRACKS)),
    albums: Boolean(flags && hasPrivacyFlag(flags, PRIVACY_FLAGS.TOP_ALBUMS)),
    artists: Boolean(flags && hasPrivacyFlag(flags, PRIVACY_FLAGS.TOP_ARTISTS)),
    genres: Boolean(flags && hasPrivacyFlag(flags, PRIVACY_FLAGS.TOP_GENRES)),
  };

  const filteredStats: Partial<
    StatsResponse & {
      tracksError?: string;
      albumsError?: string;
      artistsError?: string;
      genresError?: string;
    }
  > = {};

  if (fields.includes("tracks")) {
    if (privacySettings.tracks) {
      filteredStats.tracksError = "This user is not sharing their tracks";
    } else {
      filteredStats.tracks = result.stats.tracks;
    }
  }

  if (fields.includes("albums")) {
    if (privacySettings.albums) {
      filteredStats.albumsError = "This user is not sharing their albums";
    } else {
      filteredStats.albums = result.stats.albums;
    }
  }

  if (fields.includes("artists")) {
    if (privacySettings.artists) {
      filteredStats.artistsError = "This user is not sharing their artists";
    } else {
      filteredStats.artists = result.stats.artists;
    }
  }

  if (fields.includes("genres")) {
    if (privacySettings.genres) {
      filteredStats.genresError = "This user is not sharing their genres";
    } else {
      filteredStats.genres = result.stats.genres;
    }
  }

  return filteredStats;
}
