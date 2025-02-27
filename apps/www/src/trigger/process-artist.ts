import { SPOTIFY_BASE_API } from "@/lib/constants";
import { chunks } from "@/lib/utils";
import type { Artist } from "@/types/spotify";
import { logger, task, timeout, wait } from "@trigger.dev/sdk/v3";
import { db } from "@workspace/database/connection";
import pRetry, { AbortError, type Options } from "p-retry";
import { artists as artistsTable } from "@workspace/database/schema";
import { sql } from "@workspace/database/drizzle";

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

    for (const batch of chunks(artists, 25)) {
      const spotifyData = await Promise.all(
        batch.map(async (artist) => {
          const options: Options = {
            retries: 3,
            factor: 2,
            minTimeout: 3000,
            maxTimeout: 8000,
            onFailedAttempt: (error) => {
              console.log("FAILED");
              logger.error(
                `Retry failed ${error.attemptNumber}/${error.retriesLeft}`,
              );
            },
          };

          const data = (await pRetry(
            () => getArtistData({ accessToken, artistId: artist.id }),
            options,
          )) as Artist;

          return data;
        }),
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
