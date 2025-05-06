import { RateLimitError } from "@/lib/errors";
import { task } from "@trigger.dev/sdk/v3";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import { spotifyIdMap } from "@workspace/database/schema";
import pRetry, { type Options } from "p-retry";

export const getMBIDFromISRCTask = task({
  id: "get-mbid-from-isrc",
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: { isrc: string; spotifyId: string }, { ctx }) => {
    const { isrc, spotifyId } = payload;

    try {
      const mbid = await getMBIDFromISRC(isrc);
      await db
        .update(spotifyIdMap)
        .set({
          status: "completed",
          lastUpdated: new Date(),
          mbid,
        })
        .where(eq(spotifyIdMap.trackId, spotifyId));
      return { mbid, isrc };
    } catch (err) {
      console.error(`Failed to get MBID for ISRC ${isrc} after retries:`, err);
    }
  },
});

async function getMBIDFromISRC(isrc: string) {
  const retryOptions: Options = {
    retries: 5,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 1000 * 60 * 60,
    onFailedAttempt: (error) => {
      console.log(
        `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
      );

      if (error instanceof RateLimitError) {
        const waitTime = error.retryAfterSeconds * 1000;
        console.log(
          `Rate limited. Waiting ${error.retryAfterSeconds} seconds before retry.`,
        );

        return new Promise((r) => setTimeout(r, waitTime));
      }
    },
  };

  return pRetry(async () => {
    const request = new Request(
      `https://musicbrainz.org/ws/2/recording/?query=isrc:${isrc}&fmt=json`,
    );

    request.headers.set(
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    );

    const response = await fetch(request);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retryAfterSeconds = retryAfter
        ? Number.parseInt(retryAfter, 10)
        : 60;

      throw new RateLimitError("Rate limit exceeded", retryAfterSeconds);
    }

    if (!response.ok) {
      throw new Error(`MusicBrainz API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.recordings && data.recordings.length > 0) {
      return data.recordings[0].id;
    }

    return null;
  }, retryOptions);
}
