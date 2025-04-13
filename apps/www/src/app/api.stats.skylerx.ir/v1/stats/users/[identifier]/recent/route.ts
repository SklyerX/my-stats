import { CACHE_KEYS, CACHE_TIMES } from "@/lib/constants";
import { hasPrivacyFlag, PRIVACY_FLAGS } from "@/lib/flags";
import { redis } from "@/lib/redis";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getValidSpotifyToken } from "@/lib/spotify/tokens";
import type { APIRecentlyPlayedFormat } from "@/types";
import type { RecentlyPlayedResponse } from "@/types/spotify";
import { db } from "@workspace/database/connection";
import { z } from "zod";

interface Props {
  params: Promise<{
    identifier: string;
  }>;
}

const schema = z
  .number()
  .int()
  .refine(
    (val) => {
      const isMillisecondsTimestamp = val > 0 && val < 10000000000000;

      return isMillisecondsTimestamp;
    },
    {
      message:
        "Value must be a valid Unix timestamp (milliseconds since epoch)",
    },
  );

export async function GET(req: Request, { params }: Props) {
  const { identifier } = await params;

  const url = new URL(req.url);

  const before = url.searchParams.get("before");
  const after = url.searchParams.get("after");
  const limit = Number.parseInt(url.searchParams.get("limit") || "25");

  if (before && after)
    return new Response(
      "You cannot have a 'before' and an 'after' field simultaneously",
      { status: 400 },
    );

  if (
    (before && schema.safeParse(before).success) ||
    (after && !schema.safeParse(after).success)
  )
    return new Response(
      "Invalid timestamp for 'before' or 'after' field - Ensure your are using unix timestamps",
      { status: 400 },
    );

  const existingUser = await db.query.users.findFirst({
    where: (fields, { eq, or }) =>
      or(eq(fields.id, identifier), eq(fields.slug, identifier)),
    with: {
      tokens: true,
    },
  });

  if (!existingUser) return new Response("User not found", { status: 404 });

  const isPrivacyEnabled = hasPrivacyFlag(
    existingUser.flags,
    PRIVACY_FLAGS.RECENTLY_PLAYED,
  );

  if (isPrivacyEnabled)
    return new Response(
      JSON.stringify(
        "The requested user has disabled sharing of their recently played data",
      ),
      { status: 403 },
    );

  const cacheKey = CACHE_KEYS.recentlyPlayed(existingUser.spotifyId);
  const cache = (await redis.get(cacheKey)) as {
    consumer_api_data: APIRecentlyPlayedFormat[];
  };

  if (cache)
    return new Response(JSON.stringify(cache.consumer_api_data), {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_TIMES.recentlyPlayed}`,
      },
    });

  const accessToken = await getValidSpotifyToken(existingUser.id);

  const spotifyApi = new SpotifyAPI(accessToken);

  const recentlyPlayedTracks = await spotifyApi.getRecentlyPlayed(
    before,
    after,
    limit,
  );

  if (!recentlyPlayedTracks)
    return new Response(
      "Spotify has blocked recently-played tracks for this user",
      { status: 409 },
    );

  // adding cache so our fetcher for /[slug] doesn't have to refetch the same data
  const orderedItems = recentlyPlayedTracks.map((item) => ({
    name: item.track.name,
    artists: item.track.artists,
    album: item.track.album,
    id: item.track.id,
    playedAt: item.played_at,
  }));

  const data = recentlyPlayedTracks.map((recentlyPlayed) => ({
    played_at: recentlyPlayed.played_at,
    name: recentlyPlayed.track.name,
    album_name: recentlyPlayed.track.album.name,
    cover_image: recentlyPlayed.track.album.images.at(0)?.url,
    album_id: recentlyPlayed.track.album.id,
    track_id: recentlyPlayed.track.id,
    popularity: recentlyPlayed.track.popularity,
    artists: recentlyPlayed.track.artists.map((artist) => ({
      artistId: artist.id,
      name: artist.name,
    })),
  }));

  await redis.set(
    cacheKey,
    { orderedItems, consumer_api_data: data },
    {
      ex: CACHE_TIMES.recentlyPlayed,
    },
  );

  return new Response(JSON.stringify(data), {
    headers: {
      "Cache-Control": `private, max-age=${CACHE_TIMES.recentlyPlayed}`,
    },
  });
}

function buildResponse(recentlyPlayedTracks: RecentlyPlayedResponse["items"]) {
  return;
}
