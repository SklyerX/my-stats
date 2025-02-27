import { z } from "zod";
import { publicProcedure, router } from "../../root";
import { db } from "@workspace/database/connection";
import {
  type Artists,
  type RelatedArtists,
  artists,
} from "@workspace/database/schema";
import { desc, sql } from "@workspace/database/drizzle";
import { CACHE_KEYS, CACHE_TIMES } from "@/lib/constants";
import { redis } from "@/lib/redis";
import type { Album, Track } from "@/types/spotify";
import { processArtistStatsTask } from "@/trigger/process-artist-stats";
import { createSpotifyArtistEntry } from "../../actions/create-spotify-artist-entry";
import { logger } from "@/lib/logger";
import { relatedArtists as relatedArtistsTable } from "@workspace/database/schema";
import { eq } from "@workspace/database/drizzle";
import { LastFMBridge } from "@/lib/lastfm/bridge";
import { env } from "@/env";
import { processArtistsTask } from "@/trigger/process-artists";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import { TRPCError } from "@trpc/server";

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
          await createSpotifyArtistEntry(artistId);

          await redis.set(
            processCacheKey,
            {
              status: "processing",
            },
            {
              ex: 300,
            },
          );

          await processArtistStatsTask.trigger({ artistId }, { ttl: "1h" });

          return {
            artist,
            stats: null,
            status: "initiated",
            message: "Artist stats fetch has been initiated",
          };
        }

        const isQueue = await redis.get(processCacheKey);

        if (isQueue)
          return {
            artist,
            stats: null,
            status: "initiated",
            message: "Artist stats fetch are being initiated",
          };

        const cachedStats = (await redis.get(cacheKey)) as {
          topTracks: { tracks: Track[] };
          topAlbums: (Album & {
            popularity: 132;
            topTrackCount: 3;
            bestPosition: 5;
          })[];
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

        await processArtistStatsTask.trigger({ artistId }, { ttl: "1h" });

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
  getRelatedArtists: publicProcedure
    .input(z.string())
    .query(async ({ input: artistId }) => {
      logger.info("Fetching related artists for", artistId);

      const cacheKey = CACHE_KEYS.relatedArtist(artistId);
      const cache = (await redis.get(cacheKey)) as Artists[];

      const queueKey = CACHE_KEYS.relatedArtistQueue(artistId);
      const queue = await redis.get(queueKey);

      if (queue) {
        return {
          status: "processing",
          data: null,
        };
      }

      if (cache)
        return {
          status: "success",
          message: "Related artists have been found",
          data: cache,
        };

      const existingArtist = await db.query.artists.findFirst({
        where: (fields, { eq }) => eq(fields.artistId, artistId),
      });

      logger.info("Existing artist (yes or no)", existingArtist ? "yes" : "no");

      const bridge = new LastFMBridge(env.LAST_FM_API_KEY);

      if (existingArtist) {
        logger.info("fetching related artists");

        const relatedArtistsFromDb = await db
          .select()
          .from(relatedArtistsTable)
          .innerJoin(
            artists,
            eq(relatedArtistsTable.relatedArtistId, artists.artistId),
          )
          .where(eq(relatedArtistsTable.artistId, artistId))
          .orderBy(desc(relatedArtistsTable.matchScore));

        if (relatedArtistsFromDb.length > 0) {
          logger.info("artists found, returning");

          const uniqueArtists = Array.from(
            new Map(
              relatedArtistsFromDb.map((item) => [
                item.artists.artistId,
                {
                  ...item.artists,
                  matchScore: item.related_artists.matchScore,
                },
              ]),
            ).values(),
          );

          await redis.set(cacheKey, uniqueArtists, {
            ex: CACHE_TIMES.relatedArtists,
          });

          return {
            status: "success",
            message: "Related artists have been found - fetched from db",
            data: relatedArtistsFromDb.map((rel) => rel.artists) as Artists[],
          };
        }

        logger.info("Artist not found in DB, fetching from LastFM");

        const similarArtists = await bridge.getSimilarArtistsBySpotifyId(
          existingArtist.name,
        );

        logger.info("Similar artists (at 0)", similarArtists?.at(0));

        if (!similarArtists) {
          return {
            status: "error",
            message: "No related artists found",
            data: [],
          };
        }

        logger.info("Creating trigger.dev seed");

        logger.info("similar artists");

        await processArtistsTask.trigger(
          {
            lastFmArtists: similarArtists.map((artist) => ({
              name: artist.name,
              match: artist.match, // Use the actual match score from Last.fm
            })),
            sourceArtistId: artistId,
          },
          {
            ttl: "1h",
          },
        );

        await redis.set(
          queueKey,
          { status: "processing" },
          { ex: CACHE_TIMES.relatedArtistsQueue },
        );

        return {
          status: "processing",
          data: null,
        };
      }

      const accessToken = await getSystemAccessToken();

      const spotifyApi = new SpotifyAPI(accessToken);

      logger.info("Fetching artist from Spotify");

      const artist = await spotifyApi.getArtist(artistId);

      if (!artist) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Artist not found on Spotify",
        });
      }

      const similarArtists = await bridge.getSimilarArtistsBySpotifyId(
        artist.name,
      );

      if (!similarArtists) {
        return {
          status: "error",
          message: "No related artists found",
          data: [],
        };
      }

      logger.info("Similar artists", similarArtists?.at(0));

      await processArtistsTask.trigger(
        {
          lastFmArtists: similarArtists.map((artist) => ({
            name: artist.name,
            match: artist.match, // Use the actual match score from Last.fm
          })),
          sourceArtistId: artistId,
        },
        {
          ttl: "1h",
        },
      );

      await redis.set(
        queueKey,
        { status: "processing" },
        { ex: CACHE_TIMES.relatedArtistsQueue },
      );

      logger.info("Trigger.dev seed created");

      return {
        status: "processing",
        message: "Still processing data for this artists",
        data: null,
      };
    }),
});
