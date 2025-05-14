import { z } from "zod";
import { publicProcedure, router } from "../../root";
import { db } from "@workspace/database/connection";
import { getSystemAccessToken } from "@/lib/spotify/system";
import { SpotifyAPI } from "@/lib/spotify/api";
import {
  audioFeatures,
  trackArtists,
  tracks,
  type Track as DBTrack,
} from "@workspace/database/schema";
import { logger } from "@/lib/logger";
import { AudioFeaturesEngine } from "@/lib/engine/audio-features";
import { MusicBrainzMapper } from "@/lib/engine/music-brainz-map";
import type { SimplifiedArtist, Track } from "@/types/spotify";
import { sql } from "@workspace/database/drizzle";

type Artist = {
  id: string;
  name: string;
};

type ApiTrack = {
  trackId: string;
  name: string;
  album: string;
  albumId: string;
  artists: Artist[];
  isrc: string;
  duration: number;
  imageUrl: string;
  popularity: number;
};

const responseSchema = z.object({
  track: z
    .object({
      trackId: z.string(),
      name: z.string(),
      album: z.string(),
      albumId: z.string(),
      artists: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        }),
      ),
      isrc: z.string(),
      duration: z.number(),
      imageUrl: z.string(),
      popularity: z.number(),
    })
    .nullable(),
  audio_features: z.any().nullable(),
});

function mapSpotifyTrack(track: Track): ApiTrack {
  return {
    trackId: track.id,
    name: track.name,
    album: track.album.name,
    albumId: track.album.id,
    artists: track.artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
    })),
    isrc: track.external_ids?.isrc ?? "",
    duration: track.duration_ms ?? 0,
    imageUrl:
      track.album?.images?.[0]?.url ?? "https://via.placeholder.com/1000",
    popularity: track.popularity ?? 0,
  };
}

function mapDbTrackBase(track: DBTrack): Omit<ApiTrack, "artists"> {
  return {
    trackId: track.trackId,
    name: track.name,
    albumId: track.albumId,
    album: track.album,
    isrc: track.isrc ?? "",
    duration: track.duration ?? 0,
    imageUrl: track.imageUrl ?? "https://via.placeholder.com/1000",
    popularity: track.popularity ?? 0,
  };
}

async function insertArtistsToDB(trackId: string, artists: SimplifiedArtist[]) {
  try {
    logger.info(`Saving ${artists.length} for track -> ${trackId}`);

    const artistsData = artists.map((artist, index) => ({
      artistId: artist.id,
      artistName: artist.name,
      trackId: trackId,
      order: index,
    }));

    logger.info(`Artist data to insert: ${JSON.stringify(artistsData)}`);

    await db.insert(trackArtists).values(artistsData);

    logger.info(`Successfully saved artists for track ${trackId}`);
  } catch (err) {
    logger.error("Something went wrong", err);
  }
}

export const tracksRouter = router({
  getTrackData: publicProcedure
    .input(z.string())
    .output(responseSchema)
    .query(async ({ input: trackId }) => {
      logger.info(`Starting call on ${trackId}`);

      const existingData = await db.query.audioFeatures.findFirst({
        where: (fields, { eq }) => eq(fields.spotifyId, trackId),
        with: {
          track: true,
        },
      });

      logger.info(`Is there data ${String(!!existingData)}`);

      const accessToken = await getSystemAccessToken();
      const spotifyApi = new SpotifyAPI(accessToken);

      logger.info("starting if clause");

      if (existingData) {
        logger.info("Data found");
        if (existingData.track) {
          logger.info("Track found, starting db check");

          const artists = await db.query.trackArtists.findMany({
            where: (fields, { eq }) => eq(fields.trackId, trackId),
            orderBy: (fields, { asc }) => asc(fields.order),
          });

          logger.info(`Found ${artists.length} artists for ${trackId}`);

          let artistsData = artists.map((artist) => ({
            id: artist.artistId,
            name: artist.artistName,
          }));

          if (artistsData.length === 0) {
            const track = await spotifyApi.getTrack(trackId);
            await insertArtistsToDB(trackId, track.artists);
            artistsData = track.artists.map((artist) => ({
              id: artist.id,
              name: artist.name,
            }));
          }

          const baseTrack = mapDbTrackBase(existingData.track);

          logger.info(`Returning -> ${JSON.stringify(artistsData)}`);

          return {
            track: {
              ...baseTrack,
              artists: artistsData,
            },
            audio_features: existingData.featureData,
          };
        }

        try {
          const spotifyTrack = await spotifyApi.getTrack(trackId);
          const track = mapSpotifyTrack(spotifyTrack);

          logger.info("Fetched spotify track inserting said track to database");

          await db.insert(tracks).values({
            trackId: track.trackId,
            name: track.name,
            album: track.album,
            albumId: spotifyTrack.album.id,
            artist: track.artists[0]?.name ?? "Unknown",
            isrc: track.isrc,
            duration: track.duration,
            imageUrl: track.imageUrl,
            popularity: track.popularity,
          });

          logger.info(
            `Entering insertion function -> insertArtistsToDB(${trackId}, ${JSON.stringify(spotifyTrack.artists)})`,
          );

          await insertArtistsToDB(spotifyTrack.id, spotifyTrack.artists);

          return {
            track,
            audio_features: existingData.featureData,
          };
        } catch (err) {
          logger.error("Something went wrong:", err);
          return {
            track: null,
            audio_features: existingData.featureData,
          };
        }
      }

      logger.info("Nothing found in db, starting regular fetch engine");

      try {
        const mapper = new MusicBrainzMapper(db, spotifyApi);
        const mapper_data = await mapper.getOrCreateMapping(trackId);
        const spotifyTrack = await spotifyApi.getTrack(trackId);

        if (!mapper_data?.mbid) {
          return {
            track: mapSpotifyTrack(spotifyTrack),
            audio_features: null,
          };
        }

        const engine = new AudioFeaturesEngine(mapper_data.mbid);
        const data = await engine.getAudioFeatures(
          spotifyTrack.external_ids.isrc,
        );
        const track = mapSpotifyTrack(spotifyTrack);

        await db
          .insert(tracks)
          .values({
            trackId: track.trackId,
            name: track.name,
            album: track.album,
            albumId: spotifyTrack.album.id,
            artist: track.artists[0]?.name ?? "Unknown",
            isrc: track.isrc,
            duration: track.duration,
            imageUrl: track.imageUrl,
            popularity: track.popularity,
          })
          .onConflictDoUpdate({
            target: tracks.trackId,
            set: {
              popularity: sql`excluded.popularity`,
              updatedAt: sql`excluded.updated_at`,
            },
          });

        const artistsData = spotifyTrack.artists.map((artist, index) => ({
          artistId: artist.id,
          artistName: artist.name,
          trackId: spotifyTrack.id,
          order: index,
        }));

        if (artistsData.length > 0) {
          logger.info("adding artists to track");
          await insertArtistsToDB(trackId, spotifyTrack.artists);
        }

        if (!data) {
          return {
            track,
            audio_features: null,
          };
        }

        await db.insert(audioFeatures).values({
          spotifyId: trackId,
          available: !!data,
          featureData: data || null,
          lastUpdated: new Date(),
          lookupAttempts: 1,
          mbid: mapper_data.mbid,
        });

        return {
          track,
          audio_features: data,
        };
      } catch (err) {
        logger.error("Error in audio features workflow:", err);
        return {
          track: null,
          audio_features: null,
        };
      }
    }),
});
