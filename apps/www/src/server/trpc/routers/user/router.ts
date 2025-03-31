import { TopStatsAnalyzer } from "@/lib/spotify/top-stats-analyzer";
import { publicProcedure, router } from "../../root";
import { type RecentlyPlayed, topStatsSchema } from "./types";
import { getValidSpotifyToken } from "@/lib/spotify/tokens";
import { redis } from "@/lib/redis";
import { CACHE_KEYS, CACHE_TIMES, SPOTIFY_BASE_API } from "@/lib/constants";
import { db } from "@workspace/database/connection";
import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import type { InternalTopUserStats } from "@/types/response";
import { z } from "zod";
import {
  TIME_RANGES,
  type PlaybackResponse,
  type RecentlyPlayedResponse,
} from "@/types/spotify";
import { processArtistTask } from "@/trigger/process-artist";
import { SpotifyAPI } from "@/lib/spotify/api";
import { logger } from "@/lib/logger";
import { protectedProcedure } from "../../middleware/auth";
import { getUserTopStats } from "@/lib/spotify/user-stats-service";

export const userRouter = router({
  top: publicProcedure
    .input(topStatsSchema)
    .output(z.custom<InternalTopUserStats>())
    .query(async ({ input }) => {
      const requestId = Math.random().toString(36).substring(7);
      const startTime = Date.now();
      const headersList = await headers();

      console.log(
        `\n[${requestId}] ========= REQUEST START ${new Date().toISOString()} =========`,
      );

      console.log(`[${requestId}] Headers:`, {
        "user-agent": headersList.get("user-agent"),
        "x-forwarded-for": headersList.get("x-forwarded-for"),
        host: headersList.get("host"),
      });

      const { limit, offset, slug } = input;
      const time_range = input.time_range ?? "short_term";

      console.log(`[${requestId}] Query params:`, {
        time_range,
        limit,
        offset,
      });

      try {
        console.log(`[${requestId}] 🔍 Looking up user in DB...`);

        const dbStart = Date.now();
        const existingUser = await db.query.users.findFirst({
          where: (fields, { eq }) => eq(fields.slug, slug),
        });
        console.log(
          `[${requestId}] DB lookup completed in ${Date.now() - dbStart}ms`,
        );

        if (!existingUser) {
          console.log(`[${requestId}] ❌ User not found for slug: ${slug}`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const result = await getUserTopStats(
          existingUser,
          input.time_range ?? "short_term",
          input.limit ?? 50,
          input.offset ?? 0,
        );

        return result;
      } catch (err) {
        console.error(`[${requestId}] ❌ ERROR:`, err);
        console.log(
          `[${requestId}] ========= REQUEST ERROR END (${Date.now() - startTime}ms) =========\n`,
        );

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while fetching data",
          cause: err,
        });
      }
    }),
  recentlyPlayed: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input: { slug } }) => {
      const existingUser = await db.query.users.findFirst({
        where: (fields, { eq }) => eq(fields.slug, slug),
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const cacheKey = CACHE_KEYS.recentlyPlayed(existingUser.spotifyId);
      const cached = (await redis.get(cacheKey)) as RecentlyPlayed[];

      if (cached) return cached;

      const accessToken = await getValidSpotifyToken(existingUser.id);

      const recentlyPlayedRequest = new Request(
        `${SPOTIFY_BASE_API}/me/player/recently-played?limit=50`,
      );

      recentlyPlayedRequest.headers.set(
        "Authorization",
        `Bearer ${accessToken}`,
      );

      const response = await fetch(recentlyPlayedRequest);

      if (!response.ok) {
        console.log(response);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch recently played tracks",
        });
      }

      const data = (await response.json()) as RecentlyPlayedResponse;

      const orderedItems = data.items.map((item) => ({
        name: item.track.name,
        artists: item.track.artists,
        album: item.track.album,
        id: item.track.id,
        playedAt: item.played_at,
      }));

      await redis.set(cacheKey, orderedItems, {
        ex: CACHE_TIMES.recentlyPlayed,
      });

      return orderedItems;
    }),
  getPlayback: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const { userId } = input;
        const cacheKey = CACHE_KEYS.playback(userId);

        const cached = (await redis.get(cacheKey)) as Omit<
          PlaybackResponse,
          "device"
        > & { cachedAt: number };

        if (cached) {
          const updatedProgress =
            cached.progress_ms + (Date.now() - cached.cachedAt);

          return { ...cached, progress_ms: updatedProgress };
        }

        const existingUser = await db.query.users.findFirst({
          where: (fields, { eq }) => eq(fields.id, userId),
        });

        if (!existingUser)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });

        const accessToken = await getValidSpotifyToken(existingUser.id);

        const spotifyApi = new SpotifyAPI(accessToken);

        const data = await spotifyApi.getPlayback();

        if (!data) return null;

        const { device, ...rest } = data;

        if (device.is_private_session || !rest.is_playing) return null;

        const expirationSeconds = Math.max(
          1,
          Math.floor(((rest.item?.duration_ms || 0) - rest.progress_ms) / 1000),
        );

        await redis.set(
          cacheKey,
          { ...rest, cachedAt: Date.now() },
          {
            ex: expirationSeconds,
          },
        );

        return rest;
      } catch (err) {
        console.error(err);
        return null;
      }
    }),
  compare: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        timeRange: z.enum(TIME_RANGES).optional().default("short_term"),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { slug, timeRange } = input;

      const existingUser = await db.query.users.findFirst({
        where: (fields, { eq }) => eq(fields.slug, slug),
      });

      if (!existingUser)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });

      if (existingUser.id === ctx.user.id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot compare stats with yourself",
        });

      const targetStats = await getUserTopStats(existingUser, timeRange);
      const selfStats = await getUserTopStats(ctx.user, timeRange);

      const mutualArtists = targetStats.stats.artists.filter((targetArtist) =>
        selfStats.stats.artists.some(
          (selfArtist) => selfArtist.id === targetArtist.id,
        ),
      );
      const mutualTracks = targetStats.stats.tracks.filter((targetTrack) =>
        selfStats.stats.tracks.some(
          (selfTrack) => selfTrack.id === targetTrack.id,
        ),
      );
      const mutualAlbums = targetStats.stats.albums.filter((targetAlbum) =>
        selfStats.stats.albums.some(
          (selfAlbum) => selfAlbum.id === targetAlbum.id,
        ),
      );
      const mutualGenres = targetStats.stats.genres.filter((targetGenre) =>
        selfStats.stats.genres.some((selfGenre) => selfGenre === targetGenre),
      );

      return {
        similarities: {
          artists: mutualArtists,
          tracks: mutualTracks,
          albums: mutualAlbums,
          genres: mutualGenres,
        },
      };
    }),
});
