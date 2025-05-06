import { CACHE_KEYS } from "@/lib/constants";
import { redis } from "@/lib/redis";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import { logger, task, timeout } from "@trigger.dev/sdk/v3";
import { db } from "@workspace/database/connection";
import { sql } from "@workspace/database/drizzle";
import { artistsStats } from "@workspace/database/schema";

interface AlbumScores {
  score: number;
  topTrackCount: number;
  highestPosition: number;
}

export const processArtistStatsTask = task({
  id: "process-artist-stats",
  maxDuration: 600,
  run: async (
    payload: {
      artistId: string;
    },
    { ctx },
  ) => {
    const { artistId } = payload;

    const cacheKey = CACHE_KEYS.artistStats(artistId);
    const processingCacheKey = CACHE_KEYS.artistsQueue(artistId);

    const accessToken = await getSystemAccessToken();

    const spotifyApi = new SpotifyAPI(accessToken);

    logger.info(`Fetching top tracks and albums for ${artistId}`);

    const [topTracks, albums] = await Promise.all([
      spotifyApi.getArtistTopTracks(artistId),
      spotifyApi.getArtistAlbums(artistId),
    ]);

    const albumScores = new Map<string, AlbumScores>();

    logger.info(
      `Processing artist stats for ${artistId} - fetch for top tracks and albums done`,
    );

    topTracks.tracks.forEach((track, index) => {
      const albumId = track.album.id;
      if (!albumScores.has(albumId)) {
        albumScores.set(albumId, {
          score: 0,
          topTrackCount: 0,
          highestPosition: index,
        });
      }

      const score = albumScores.get(albumId) as AlbumScores;
      score.score += 50 - index;
      score.topTrackCount++;
      score.highestPosition = Math.min(score.highestPosition, index);

      logger.info(`Processed ${index}/${topTracks.tracks.length} top tracks`);
    });

    const scoredAlbums = albums.items
      .map((album) => ({
        ...album,
        popularity: albumScores.get(album.id)?.score || 0,
        topTrackCount: albumScores.get(album.id)?.topTrackCount || 0,
        bestPosition: albumScores.get(album.id)?.highestPosition || 999,
      }))
      .sort((a, b) => b.popularity - a.popularity);

    const stats = {
      topTracks,
      topAlbums: scoredAlbums,
      lastUpdated: new Date(),
    };

    await redis.set(cacheKey, stats, {
      ex: 7 * 24 * 60 * 60,
    });

    await db
      .insert(artistsStats)
      .values({
        topAlbums: scoredAlbums,
        topTracks: topTracks,
        artistId: artistId,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: artistsStats.artistId,
        set: {
          topAlbums: sql`excluded.top_albums`,
          topTracks: sql`excluded.top_tracks`,
          lastUpdated: sql`excluded.last_updated`,
        },
      });

    await redis.del(processingCacheKey);
  },
});
