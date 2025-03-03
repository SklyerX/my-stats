import { CACHE_KEYS, CACHE_TIMES } from "@/lib/constants";
import { AudioFeaturesEngine } from "@/lib/engine/audio-features";
import { MusicBrainzMapper } from "@/lib/engine/music-brainz-map";
import {
  AcousticBrainzAPIError,
  MusicBrainzAPIError,
  NoAcousticBrainzDataError,
  NoMusicBrainzDataError,
} from "@/lib/errors";
import { redis } from "@/lib/redis";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import { logger, task } from "@trigger.dev/sdk/v3";
import { db } from "@workspace/database/connection";
import { sql } from "@workspace/database/drizzle";
import { audioFeatures } from "@workspace/database/schema";

export const processTrack = task({
  id: "process-track",
  maxDuration: 600,
  run: async (payload: {
    trackId: string;
    isrc: string;
  }) => {
    const { trackId, isrc } = payload;

    try {
      const accessToken = await getSystemAccessToken();

      const spotifyApi = new SpotifyAPI(accessToken);
      const mapper = new MusicBrainzMapper(db, spotifyApi);

      const mapper_data = await mapper.getOrCreateMapping(trackId);

      if (!mapper_data?.mbid) {
        logger.error(
          `Could not find MBID for ${isrc} (isrc) | ${trackId} (trackId)`,
        );
        return;
      }

      const audioEngine = new AudioFeaturesEngine(mapper_data.mbid);

      const features = await audioEngine.getAudioFeatures(isrc);

      logger.info("features", features);

      const cacheKey = CACHE_KEYS.trackAudioFeatures(trackId);

      logger.info("setting cache key", { cacheKey });

      await redis.set(cacheKey, features, {
        ex: CACHE_TIMES.trackAudioFeatures,
      });

      logger.info("inserting into db");

      await db
        .insert(audioFeatures)
        .values({
          spotifyId: trackId,
          mbid: mapper_data.mbid,
          featureData: features,
          available: true,
          lastUpdated: new Date(),
          lookupAttempts: 1,
        })
        .onConflictDoUpdate({
          target: audioFeatures.spotifyId,
          set: {
            lastUpdated: sql`excluded.last_updated`,
            lookupAttempts: sql`${audioFeatures.lookupAttempts}`,
          },
        });

      logger.info("done");
    } catch (err) {
      let unavailableReason = "unknown";

      logger.error("error processing track");

      logger.error(`there was an error found, ${err}`);

      if (err instanceof NoMusicBrainzDataError) {
        logger.error("no musicbrainz data");
        unavailableReason = "no_musicbrainz_data";
      } else if (err instanceof NoAcousticBrainzDataError) {
        logger.error("no acousticbrainz data");
        unavailableReason = "track_not_analyzed";
      } else if (
        err instanceof MusicBrainzAPIError ||
        err instanceof AcousticBrainzAPIError
      ) {
        logger.error("api error");
        unavailableReason = "rate_limited";
      } else {
        logger.error("unknown error");
        unavailableReason = "api_error";
      }

      logger.warn("inserting null data into db");

      const queueKey = CACHE_KEYS.trackAudioFeaturesQueue(trackId);

      await redis.del(queueKey);

      // await db.insert(audioFeatures).values({
      //   spotifyId: trackId,
      //   unavailableReason,
      //   available: false,
      //   lastUpdated: new Date(),
      //   lookupAttempts: 1,
      //   featureData: null,
      // });
    }
  },
});
