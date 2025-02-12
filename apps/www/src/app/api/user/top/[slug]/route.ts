import { CACHE_KEYS, CACHE_TIMES } from "@/lib/constants";
import { redis } from "@/lib/redis";
import { getValidSpotifyToken } from "@/lib/spotify/tokens";
import { TopStatsAnalyzer } from "@/lib/spotify/top-stats-analyzer";
import { db } from "@workspace/database/connection";
import { z } from "zod";

interface Props {
  params: {
    slug: string;
  };
}

const schema = z.object({
  time_range: z
    .enum(["short_term", "medium_term", "long_term"])
    .nullable()
    .default("short_term"),
  limit: z.number().min(1).max(50).nullable().default(50),
  offset: z.number().min(1).max(50).nullable().default(50),
});

export async function GET(req: Request, { params }: Props) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  console.log(
    `\n[${requestId}] ========= REQUEST START ${new Date().toISOString()} =========`,
  );
  console.log(`[${requestId}] URL: ${req.url}`);

  console.log(`[${requestId}] Headers:`, {
    "user-agent": req.headers.get("user-agent"),
    "x-forwarded-for": req.headers.get("x-forwarded-for"),
    host: req.headers.get("host"),
  });

  const url = new URL(req.url);
  const time_range = url.searchParams.get("time_range");
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");

  const { slug } = await params;

  console.log(`[${requestId}] Query params:`, { time_range, limit, offset });
  console.log(`[${requestId}] Route params:`, params);

  const { success, data } = schema.safeParse({
    time_range,
    limit,
    offset,
  });

  console.log(`[${requestId}] Schema validation:`, { success, data });

  if (!success) {
    console.log(`[${requestId}] ❌ Bad request - Failed schema validation`);
    console.log(
      `[${requestId}] ========= REQUEST END (${Date.now() - startTime}ms) =========\n`,
    );

    return new Response("Bad Request", { status: 400 });
  }

  try {
    // DB Operation timing
    console.log(`[${requestId}] 🔍 Looking up user in DB...`);

    const dbStart = Date.now();
    const existingUser = await db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.slug, slug),
    });

    console.log(
      `[${requestId}] DB lookup completed in ${Date.now() - dbStart}ms`,
    );

    if (!existingUser) {
      console.log(`[${requestId}] ❌ User not found for slug: ${params.slug}`);
      console.log(
        `[${requestId}] ========= REQUEST END (${Date.now() - startTime}ms) =========\n`,
      );

      return new Response("User not found", { status: 404 });
    }

    const time_range = data.time_range ?? "short_term";
    const cacheKey = CACHE_KEYS.top(existingUser.spotifyId, time_range);

    // Redis GET operation
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
      return new Response(
        JSON.stringify({
          stats: cached,
          user: {
            image: existingUser.image,
            name: existingUser.username,
            bio: existingUser.bio,
          },
        }),
      );
    }

    // Spotify token fetch
    console.log(`[${requestId}] 🎵 Fetching Spotify token...`);

    const tokenStart = Date.now();
    const accessToken = await getValidSpotifyToken(existingUser.id);

    console.log(
      `[${requestId}] Token fetch completed in ${Date.now() - tokenStart}ms`,
    );

    // Stats analysis
    console.log(`[${requestId}] 📊 Analyzing stats...`);

    const analysisStart = Date.now();
    const analyzer = new TopStatsAnalyzer(accessToken);
    const stats = await analyzer.getStatistics(
      time_range,
      data.limit ?? 50,
      data.offset ?? 0,
    );

    console.log(
      `[${requestId}] Stats analysis completed in ${Date.now() - analysisStart}ms`,
    );

    // Redis SET operation
    console.log(`[${requestId}] 💾 Redis SET for key: ${cacheKey}`);

    const redisSetStart = Date.now();
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

    return new Response(
      JSON.stringify({
        stats,
        user: {
          image: existingUser.image,
          name: existingUser.username,
          bio: existingUser.bio,
        },
      }),
    );
  } catch (err) {
    console.error(`[${requestId}] ❌ ERROR:`, err);
    console.log(
      `[${requestId}] ========= REQUEST ERROR END (${Date.now() - startTime}ms) =========\n`,
    );
    return new Response("Something went wrong while fetching data", {
      status: 500,
    });
  }
}
