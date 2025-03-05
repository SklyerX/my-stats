import { z } from "zod";
import { publicProcedure, router } from "../../root";
import { db } from "@workspace/database/connection";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import {
  type AlbumArtists,
  type Albums,
  albums,
  albumsArtists,
  type Artists,
  artists,
} from "@workspace/database/schema";
import { sql } from "@workspace/database/drizzle";
import { CACHE_KEYS } from "@/lib/constants";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

type TrackType = {
  id: string;
  name: string;
  trackNumber: number;
  durationMs: number;
  explicit: boolean;
  popularity: number;
  artists: {
    id: string;
    name: string;
  }[];
};

export interface TRPCAlbumDataResponse
  extends Omit<Albums, "createdAt" | "id"> {
  tracks: TrackType[];
  albumsArtists: AlbumArtists &
    {
      artist: Artists;
    }[];
}

export const albumsRouter = router({
  getAlbumData: publicProcedure
    .input(z.string())
    .query(async ({ input: albumId }) => {
      const cacheKey = CACHE_KEYS.albumData(albumId);
      const cache = await redis.get(cacheKey);

      if (cache) return cache as TRPCAlbumDataResponse;

      const existingAlbum = await db.query.albums.findFirst({
        where: (fields, { eq }) => eq(fields.albumId, albumId),
        with: {
          albumsArtists: {
            with: {
              artist: true,
            },
          },
        },
      });

      if (existingAlbum) return existingAlbum;

      const accessToken = await getSystemAccessToken();
      const spotifyApi = new SpotifyAPI(accessToken);

      const spotifyAlbum = await spotifyApi.getAlbum(albumId);

      logger.info("tracks", spotifyAlbum.tracks);

      const trackData: TrackType[] = spotifyAlbum.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        trackNumber: track.track_number,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        popularity: track.popularity,
        artists: track.artists.map((artist) => ({
          id: artist.id,
          name: artist.name,
        })),
      }));

      const dto = {
        albums: {
          albumCover: spotifyAlbum.images.at(0)?.url ?? "",
          albumId: spotifyAlbum.id,
          name: spotifyAlbum.name,
          releaseDate: new Date(spotifyAlbum.release_date),
          totalTracks: spotifyAlbum.total_tracks,
          albumType: spotifyAlbum.album_type,
          popularity: spotifyAlbum.popularity,
          tracks: trackData as TRPCAlbumDataResponse["tracks"],
          createdAt: new Date(),
        },
        albumArtists: spotifyAlbum.artists.map((artist) => ({
          albumId: spotifyAlbum.id,
          artistId: artist.id,
        })),
      };

      const artistIds = spotifyAlbum.artists.map((a) => a.id);
      const spotifyArtists = await spotifyApi.getMultipleArtists(artistIds);

      const artistsDto: Omit<Artists, "id" | "updatedAt">[] =
        spotifyArtists.map((artist) => ({
          artistId: artist.id,
          followerAmount: artist.followers.total,
          genres: artist.genres,
          imageUrl: artist.images.at(0)?.url ?? "",
          name: artist.name,
          popularity: artist.popularity,
        }));

      await db.batch([
        db.insert(albums).values(dto.albums).onConflictDoNothing(),
        db
          .insert(artists)
          .values(artistsDto)
          .onConflictDoUpdate({
            target: [artists.artistId],
            set: {
              followerAmount: sql`excluded.follower_amount`,
              genres: sql`excluded.genres`,
              imageUrl: sql`excluded.image_url`,
              popularity: sql`excluded.popularity`,
            },
          }),
        db.insert(albumsArtists).values(dto.albumArtists).onConflictDoNothing(),
      ]);

      const calculateExpirationTime = (): number | null => {
        const date = new Date(spotifyAlbum.release_date);
        const now = Date.now();

        const isNewerThanTwoDaysAgo =
          date.getTime() > now - 1000 * 60 * 60 * 24 * 2;
        const isPopular = spotifyAlbum.popularity > 7;

        if (isNewerThanTwoDaysAgo && isPopular) return 60 * 60 * 24 * 7; // one week

        if (!isNewerThanTwoDaysAgo && isPopular) return 60 * 60 * 24 * 21; // Three weeks;

        return null;
      };

      const EXPIRATION_TIME_IN_SEC = calculateExpirationTime();

      if (EXPIRATION_TIME_IN_SEC)
        await redis.set(
          cacheKey,
          {
            ...dto.albums,
            albumsArtists: dto.albumArtists.map((aa) => ({
              artist: artistsDto.find((a) => a.artistId === aa.artistId),
              albumId: aa.albumId,
            })),
          },
          {
            ex: EXPIRATION_TIME_IN_SEC,
          },
        );

      return {
        ...dto.albums,
        tracks: trackData as TrackType[],
        albumsArtists: dto.albumArtists.map((aa) => ({
          artist: artistsDto.find((a) => a.artistId === aa.artistId),
          albumId: aa.albumId,
        })),
      } as unknown as TRPCAlbumDataResponse;
    }),
});

/**
 Oh typescript you have damned me!
 From your weird errors to your vscode reload command, you truly are a role model.
 A tool to make your life better? Sure! But not always. That tools decides to fight me to its death for a stupid ass dto.album.tracks being typed as unknown.
 I clearly typed it out in 5000 different places. I logged it out, for fuck sakes if you hover over the album key in the DTO it shows you the type but
 nope typescript just wants to tell me I'm wrong. Like what?
 This forced me to use *as unknown as X*. I feel ashamed. From now I will turn to CoffeeScript and C++ for my future endeavour
*/
