import { CACHE_KEYS } from "@/lib/constants";
import { redis } from "@/lib/redis";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import { chunks } from "@/lib/utils";
import { createSpotifyArtistEntry } from "@/server/trpc/actions/create-spotify-artist-entry";
import { task, wait } from "@trigger.dev/sdk/v3";
import { db } from "@workspace/database/connection";
import { sql } from "@workspace/database/drizzle";
import { relatedArtists } from "@workspace/database/schema";

export const processArtistsTask = task({
  id: "process-artists",
  maxDuration: 600,
  run: async (payload: {
    lastFmArtists: { name: string; match: string }[];
    sourceArtistId: string;
  }) => {
    const { lastFmArtists, sourceArtistId } = payload;

    const accessToken = await getSystemAccessToken();

    const spotifyApi = new SpotifyAPI(accessToken);

    const foundRelationships = [];

    const processedArtistIds = new Set();

    for (const chunk of chunks(lastFmArtists, 5)) {
      for (const artist of chunk) {
        const data = await spotifyApi.searchArtist({
          query: `artist:${artist.name}`,
          type: ["artist"],
          limit: 1,
        });

        if (data.artists?.items.length === 0) continue;

        const firstArtist = data.artists?.items?.[0];

        if (firstArtist && !processedArtistIds.has(firstArtist.id)) {
          processedArtistIds.add(firstArtist.id);

          await createSpotifyArtistEntry(firstArtist.id, accessToken);

          foundRelationships.push({
            artistId: sourceArtistId,
            matchScore: artist.match,
            relatedArtistId: firstArtist.id,
            source: "lastfm",
          });
          await wait.for({ seconds: 0.1 });
        }

        await wait.for({ seconds: 0.5 });
      }
    }

    const values = foundRelationships.map((rel) => ({
      artistId: rel.artistId,
      relatedArtistId: rel.relatedArtistId,
      matchScore: rel.matchScore,
      source: rel.source,
      updatedAt: new Date(),
    }));

    await db
      .insert(relatedArtists)
      .values(values)
      .onConflictDoUpdate({
        target: [relatedArtists.artistId, relatedArtists.relatedArtistId],
        set: {
          matchScore: sql`excluded.match_score`,
          source: sql`excluded.source`,
          updatedAt: sql`current_timestamp`,
        },
      });

    const cacheKey = CACHE_KEYS.relatedArtistQueue(sourceArtistId);

    await redis.del(cacheKey);

    await wait.for({ seconds: 5 });
  },
});
