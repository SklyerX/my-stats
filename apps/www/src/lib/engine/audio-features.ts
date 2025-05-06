// TODO: add retry mechanism if status_code is 429

import { logger } from "@trigger.dev/sdk/v3";
import { AcousticBrainzAPIError, MusicBrainzAPIError } from "../errors";

export class AudioFeaturesEngine {
  constructor(private readonly mbid: string) {}

  async getAudioFeatures(isrc: string) {
    const [dataHighLevel, dataLowLevel] = await Promise.all([
      this.acousticBrainzHighLevel(this.mbid),
      this.acousticBrainzLowLevel(this.mbid),
    ]);

    const highlevel = dataHighLevel.highlevel;
    const lowlevel = dataLowLevel.lowlevel;

    const features = {
      high_level: {
        danceability: {
          ratio: highlevel.danceability.all,
          danceable: highlevel.danceability.value,
          algorithm: highlevel.danceability.version,
        },
        valence: {
          happy: highlevel.mood_happy.all,
          sad: highlevel.mood_sad.all,
        },
        timbre: {
          dark: highlevel.timbre.all.dark,
          bright: highlevel.timbre.all.bright,
          mood: highlevel.timbre.value,
          accuracy: highlevel.timbre.probability,
        },
        acoustic: {
          ratio: highlevel.mood_acoustic.all,
          value: highlevel.mood_acoustic.value,
          algorithm: highlevel.mood_acoustic.version,
          accuracy: highlevel.mood_acoustic.probability,
        },
        aggressive: {
          ratio: highlevel.mood_aggressive.all,
          value: highlevel.mood_aggressive.value,
          accuracy: highlevel.mood_aggressive.probability,
        },
        electronic: {
          ratio: highlevel.mood_electronic.all,
          value: highlevel.mood_electronic.value,
          accuracy: highlevel.mood_electronic.probability,
        },
        happy: {
          ratio: highlevel.mood_happy.all,
          value: highlevel.mood_happy.value,
          accuracy: highlevel.mood_happy.probability,
        },
        party: {
          ratio: highlevel.mood_party.all,
          value: highlevel.mood_party.value,
          accuracy: highlevel.mood_party.probability,
        },
        relaxed: {
          ratio: highlevel.mood_relaxed.all,
          value: highlevel.mood_relaxed.value,
          accuracy: highlevel.mood_relaxed.probability,
        },
        sad: {
          ratio: highlevel.mood_sad.all,
          value: highlevel.mood_sad.value,
          accuracy: highlevel.mood_sad.probability,
        },
      },
      low_level: {
        loudness: lowlevel.average_loudness,
        key: {
          key: dataLowLevel.tonal.key_key,
          scale: dataLowLevel.tonal.key_scale,
          chordsScale: dataLowLevel.tonal.chords_scale,
          chordsKey: dataLowLevel.tonal.chords_key,
        },
        chords_change_rate: dataLowLevel.tonal.chords_changes_rate,
        tuning_frequency: dataLowLevel.tonal.tuning_frequency,
        bpm: dataLowLevel.rhythm.bpm,
        harmonic_tension: lowlevel.dissonance.mean,
        brightness: lowlevel.spectral_centroid.mean,
      },
    };

    return features;
  }

  // private async getMusicBrainzId(isrc: string) {
  //   const request = new Request(
  //     `https://musicbrainz.org/ws/2/recording/?query=isrc:${isrc}&fmt=json`,
  //   );

  //   request.headers.set(
  //     "User-Agent",
  //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  //   );

  //   const response = await fetch(request);

  //   if (response.status === 429) {
  //     logger.error("musicbrainz 429");
  //     const retryAfter = response.headers.get("Retry-After");
  //     const retrySeconds = retryAfter ? Number.parseInt(retryAfter, 10) : 3600;

  //     throw new MusicBrainzAPIError(
  //       "Rate limited by MusicBrainz API",
  //       429,
  //       retrySeconds,
  //     );
  //   }

  //   if (!response.ok) {
  //     logger.error("musicbrainz failed");
  //     logger.error(`status: ${response.status}`);
  //     throw new MusicBrainzAPIError(
  //       `Failed to fetch MusicBrainz ID: ${response.statusText}`,
  //       response.status,
  //     );
  //   }

  //   const data = await response.json();

  //   return data.recordings[0].id;
  // }

  private async acousticBrainzHighLevel(mbid: string) {
    const request = new Request(`
        https://acousticbrainz.org/api/v1/high-level?recording_ids=${mbid}`);

    const response = await fetch(request);

    if (response.status === 429) {
      logger.error("acousticBrainz 429");
      const retryAfter = response.headers.get("Retry-After");
      const retrySeconds = retryAfter ? Number.parseInt(retryAfter, 10) : 3600;

      throw new AcousticBrainzAPIError(
        "Rate limited by MusicBrainz API",
        429,
        retrySeconds,
      );
    }

    if (!response.ok) {
      logger.error("acousticBrainz failed - high level");
      throw new Error(`Failed to fetch MusicBrainz ID: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data[mbid] || Object.values(data[mbid]).length === 0) {
      throw new Error("No AcousticBrainz data found");
    }

    return data[mbid]["0"];
  }

  private async acousticBrainzLowLevel(mbid: string) {
    const request = new Request(`
        https://acousticbrainz.org/api/v1/low-level?recording_ids=${mbid}`);

    const response = await fetch(request);

    if (response.status === 429) {
      logger.error("acousticBrainz 429 - low level");
      const retryAfter = response.headers.get("Retry-After");
      const retrySeconds = retryAfter ? Number.parseInt(retryAfter, 10) : 3600;

      throw new AcousticBrainzAPIError(
        "Rate limited by MusicBrainz API",
        429,
        retrySeconds,
      );
    }

    if (!response.ok) {
      logger.error("acousticBrainz failed - low level");
      throw new Error(`Failed to fetch MusicBrainz ID: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data[mbid] || Object.values(data[mbid]).length === 0) {
      throw new Error("No AcousticBrainz data found");
    }

    return data[mbid]["0"];
  }
}
