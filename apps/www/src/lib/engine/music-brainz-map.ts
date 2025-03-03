import type { db } from "@workspace/database/connection";
import type { SpotifyAPI } from "../spotify/api";
import { getMBIDFromISRCTask } from "@/trigger/get-mbid-from-isrc";
import { spotifyIdMap } from "@workspace/database/schema";

export class MusicBrainzMapper {
  constructor(
    private readonly database: typeof db,
    private readonly spotifyApi: SpotifyAPI,
  ) {}

  async getOrCreateMapping(spotifyId: string) {
    const existingMapping = await this.getMapping(spotifyId);

    if (existingMapping) return existingMapping;

    const {
      external_ids: { isrc },
    } = await this.spotifyApi.getTrack(spotifyId);

    if (!isrc) return null;

    await this.createPendingMapping(spotifyId, isrc);

    await getMBIDFromISRCTask.trigger(
      { isrc, spotifyId },
      { ttl: 60 * 60 + 200 },
    );

    return {
      trackId: spotifyId,
      isrc,
      mbid: null,
      status: "pending",
    };
  }

  private async getMapping(spotifyId: string) {
    const data = await this.database.query.spotifyIdMap.findFirst({
      where: (fields, { eq }) => eq(fields.trackId, spotifyId),
    });

    return data;
  }

  private async createPendingMapping(spotifyId: string, isrc: string) {
    await this.database.insert(spotifyIdMap).values({
      isrc,
      trackId: spotifyId,
      mbid: null,
      status: "pending",
    });
  }
}
