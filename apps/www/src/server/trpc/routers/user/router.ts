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
import type { RecentlyPlayedResponse } from "@/types/spotify";
import { processArtistTask } from "@/trigger/process-artist";

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

        const cacheKey = CACHE_KEYS.top(existingUser.spotifyId, time_range);
        console.log(`[${requestId}] 🔍 Redis GET for key: ${cacheKey}`);
        const redisGetStart = Date.now();

        const cached = await redis.get(cacheKey);

        console.log(
          `[${requestId}] Redis GET completed in ${Date.now() - redisGetStart}ms`,
        );

        console.log(`[${requestId}] Cache ${cached ? "HIT ✅" : "MISS ❌"}`);

        if (cached) {
          console.log(`[${requestId}] Returning cached data`);
          console.log(
            `[${requestId}] ========= REQUEST END (${Date.now() - startTime}ms) =========\n`,
          );
          return {
            stats: cached,
            user: {
              image: existingUser.image,
              name: existingUser.username,
              bio: existingUser.bio,
            },
          } as InternalTopUserStats;
        }

        console.log(`[${requestId}] 🎵 Fetching Spotify token...`);

        const tokenStart = Date.now();
        const accessToken = await getValidSpotifyToken(existingUser.id);

        console.log(
          `[${requestId}] Token fetch completed in ${Date.now() - tokenStart}ms`,
        );

        console.log(`[${requestId}] 📊 Analyzing stats...`);
        const analysisStart = Date.now();

        const analyzer = new TopStatsAnalyzer(accessToken);
        const stats = await analyzer.getStatistics(
          time_range,
          limit ?? 50,
          offset ?? 0,
        );

        console.log(
          `[${requestId}] Stats analysis completed in ${Date.now() - analysisStart}ms`,
        );

        console.log(`[${requestId}] 💾 Redis SET for key: ${cacheKey}`);

        const redisSetStart = Date.now();

        console.log("running trigger.dev");
        const triggerDevStart = Date.now();

        await processArtistTask.trigger({
          artists: stats.artists,
          accessToken,
        });

        console.log(`end of trigger.dev in ${Date.now() - triggerDevStart}ms`);

        await redis.set(cacheKey, stats, {
          ex: CACHE_TIMES[time_range],
        });

        console.log(
          `[${requestId}] Redis SET completed in ${Date.now() - redisSetStart}ms`,
        );

        const totalTime = Date.now() - startTime;

        console.log(
          `[${requestId}] ========= REQUEST END (${totalTime}ms) =========\n`,
        );

        return {
          stats,
          user: {
            image: existingUser.image,
            name: existingUser.username,
            bio: existingUser.bio,
          },
        } as InternalTopUserStats;
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
});
