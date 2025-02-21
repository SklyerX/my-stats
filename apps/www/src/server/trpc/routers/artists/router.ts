import { z } from "zod";
import { publicProcedure, router } from "../../root";
import { db } from "@workspace/database/connection";
import { artists } from "@workspace/database/schema";
import { sql } from "@workspace/database/drizzle";
import { CACHE_KEYS, SPOTIFY_BASE_API } from "@/lib/constants";
import { redis } from "@/lib/redis";
import { getSystemAccessToken } from "@/lib/spotify/system";
import type { Album, Artist, Track } from "@/types/spotify";
import { processArtistStatsTask } from "@/trigger/process-artist-stats";

export const artistsRouter = router({
  getArtistsByGenre: publicProcedure
    .input(z.string())
    .query(async ({ input: genre }) => {
      const artistsFromGenre = await db
        .select()
        .from(artists)
        .where(sql`${artists.genres} @> ARRAY[${genre}]::text[]`)
        .orderBy(sql`${artists.popularity} DESC NULLS LAST`)
        .limit(20);

      return artistsFromGenre;
    }),
  getArtistData: publicProcedure
    .input(z.string())
    .query(async ({ input: artistId }) => {
      const cacheKey = CACHE_KEYS.artistStats(artistId);
      const processCacheKey = CACHE_KEYS.artistsQueue(artistId);

      try {
        const artist = await db.query.artists.findFirst({
          where: (fields, { eq }) => eq(fields.artistId, artistId),
        });

        if (!artist) {
          const request = new Request(
            `${SPOTIFY_BASE_API}/artists/${artistId}`,
          );

          const accessToken = await getSystemAccessToken();

          request.headers.set("Authorization", `Bearer ${accessToken}`);

          const response = await fetch(request);
          const spotifyArtist = (await response.json()) as Artist;

          await db.insert(artists).values({
            artistId: spotifyArtist.id,
            name: spotifyArtist.name,
            imageUrl: spotifyArtist.images[0]?.url,
            genres: spotifyArtist.genres,
            popularity: spotifyArtist.popularity,
            followerAmount: spotifyArtist.followers.total,
          });

          await redis.set(
            processCacheKey,
            {
              status: "processing",
            },
            {
              ex: 300,
            },
          );

          await processArtistStatsTask.trigger({ artistId });

          return {
            artist,
            stats: null,
            status: "initiated",
            message: "Artist stats fetch has been initiated",
          };
        }

        const cachedStats = (await redis.get(cacheKey)) as {
          topTracks: Track[];
          topAlbums: Album & {
            popularity: 132;
            topTrackCount: 3;
            bestPosition: 5;
          };
        };
        if (cachedStats)
          return {
            artist,
            stats: cachedStats,
          };

        await redis.set(
          processCacheKey,
          {
            status: "processing",
          },
          {
            ex: 300,
          },
        );

        await processArtistStatsTask.trigger({ artistId });

        return {
          artist,
          stats: null,
          status: "initiated",
          message: "Artist stats fetch are being initiated",
        };
      } catch (err) {
        console.error(err);

        await redis.del(processCacheKey);
      }
    }),
});
