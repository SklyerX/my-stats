import { SPOTIFY_BASE_API } from "@/lib/constants";
import { chunks } from "@/lib/utils";
import type { Artist } from "@/types/spotify";
import { logger, task, timeout, wait } from "@trigger.dev/sdk/v3";
import { db } from "@workspace/database/connection";
import pRetry, { AbortError, type Options } from "p-retry";
import { artists as artistsTable } from "@workspace/database/schema";
import { sql } from "@workspace/database/drizzle";
import { SpotifyAPI } from "@/lib/spotify/api";

async function getArtistData({
  artistId,
  accessToken,
}: { artistId: string; accessToken: string }) {
  const request = new Request(`${SPOTIFY_BASE_API}/artists/${artistId}`);
  request.headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(request);

  if (!response.ok) {
    if (response.status === 429) {
      logger.error(`Ratelimited while fetching for - ${artistId}`);
      throw new AbortError(response.statusText);
    }

    logger.error(`Failed to fetch artist data for ${artistId}`);
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export const processArtistTask = task({
  id: "process-artist",
  maxDuration: 600,
  run: async (
    payload: {
      artists: Array<Artist>;
      accessToken: string;
    },
    { ctx },
  ) => {
    const { artists, accessToken } = payload;

    const spotifyApi = new SpotifyAPI(accessToken);

    for (const batch of chunks(artists, 50)) {
      const spotifyData = await spotifyApi.getMultipleArtists(
        batch.map((artist) => artist.id),
      );

      const artistsToUpsert = spotifyData
        .filter((artist): artist is Artist => artist !== null)
        .map((artist) => ({
          name: artist.name,
          genres: artist.genres,
          artistId: artist.id,
          imageUrl: artist.images?.[0]?.url,
          followerAmount: artist.followers.total,
          popularity: artist.popularity,
          updatedAt: new Date(),
        }));

      if (artistsToUpsert.length > 0) {
        await db
          .insert(artistsTable)
          .values(artistsToUpsert)
          .onConflictDoUpdate({
            target: artistsTable.id,
            set: {
              genres: sql`excluded.genres`,
              updatedAt: sql`excluded.updated_at`,
              popularity: sql`excluded.popularity`,
              followerAmount: sql`excluded.follower_amount`,
              imageUrl: sql`excluded.image_url`,
            },
          });
      }

      await wait.for({ seconds: 5 });
    }
  },
});
