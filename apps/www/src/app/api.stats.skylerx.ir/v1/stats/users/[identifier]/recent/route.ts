import { CACHE_KEYS, CACHE_TIMES } from "@/lib/constants";
import { hasPrivacyFlag, PRIVACY_FLAGS } from "@/lib/flags";
import { redis } from "@/lib/redis";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getValidSpotifyToken } from "@/lib/spotify/tokens";
import type { RecentlyPlayedResponse } from "@/types/spotify";
import { db } from "@workspace/database/connection";

interface Props {
  params: Promise<{
    identifier: string;
  }>;
}

export async function GET(req: Request, { params }: Props) {
  const { identifier } = await params;

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
  const cache = await redis.get(cacheKey);

  if (cache)
    return new Response(JSON.stringify(cache), {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_TIMES.recentlyPlayed}`,
      },
    });

  const accessToken = await getValidSpotifyToken(existingUser.id);

  const spotifyApi = new SpotifyAPI(accessToken);

  const recentlyPlayedTracks = await spotifyApi.getRecentlyPlayed();

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

  await redis.set(cacheKey, orderedItems, {
    ex: CACHE_TIMES.recentlyPlayed,
  });

  return new Response(JSON.stringify(buildResponse(recentlyPlayedTracks)), {
    headers: {
      "Cache-Control": `private, max-age=${CACHE_TIMES.recentlyPlayed}`,
    },
  });
}

function buildResponse(recentlyPlayedTracks: RecentlyPlayedResponse["items"]) {
  return recentlyPlayedTracks.map((recentlyPlayed) => ({
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
}
