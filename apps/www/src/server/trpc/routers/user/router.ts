import { publicProcedure, router } from "../../root";
import { type RecentlyPlayed, topStatsSchema } from "./types";
import { getValidSpotifyToken } from "@/lib/spotify/tokens";
import { redis } from "@/lib/redis";
import { CACHE_KEYS, CACHE_TIMES, SPOTIFY_BASE_API } from "@/lib/constants";
import { db, type db as DBType } from "@workspace/database/connection";
import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import type { InternalTopUserStats } from "@/types/response";
import { z } from "zod";
import {
  type StatsResponse,
  TIME_RANGES,
  type PlaybackResponse,
  type RecentlyPlayedResponse,
  type UserPlaylistsResponse,
  type PlaylistItem,
} from "@/types/spotify";
import { SpotifyAPI } from "@/lib/spotify/api";
import { protectedProcedure } from "../../middleware/auth";
import { getUserTopStats } from "@/lib/spotify/user-stats-service";
import { hasPrivacyFlag, PRIVACY_FLAGS } from "@/lib/flags";
import { getCurrentSession } from "@/auth/session";
import { chunks, sleep } from "@/lib/utils";
import { downloadExports } from "@workspace/database/schema";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/env";
import { randomUUID } from "node:crypto";
import { s3 } from "@/lib/s3-client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { revalidatePath } from "next/cache";
import {
  calculatePlaylistAnalytics,
  getPlaylistAnalytics,
} from "./services/playlist";
import { fetchTracksFromSpotify } from "./services/tracks";
import { tryCatch } from "@/lib/try-catch";

export const userRouter = router({
  top: publicProcedure
    .input(topStatsSchema)
    .output(z.custom<InternalTopUserStats>())
    .query(async ({ input }) => {
      const requestId = Math.random().toString(36).substring(7);
      const startTime = Date.now();
      const headersList = await headers();

      console.log(
        `\n[${requestId}] ========= REQUEST START ${new Date().toISOString()} =========`
      );

      console.log(`[${requestId}] Headers:`, {
        "user-agent": headersList.get("user-agent"),
        "x-forwarded-for": headersList.get("x-forwarded-for"),
        host: headersList.get("host"),
      });

      const { limit, offset, slug } = input;
      const time_range = input.time_range ?? "short_term";

      console.log(`[${requestId}] Query params:`, {
        time_range,
        limit,
        offset,
      });

      try {
        console.log(`[${requestId}] 🔍 Looking up user in DB...`);

        const dbStart = Date.now();
        const existingUser = await db.query.users.findFirst({
          where: (fields, { eq }) => eq(fields.slug, slug),
        });
        console.log(
          `[${requestId}] DB lookup completed in ${Date.now() - dbStart}ms`
        );

        if (!existingUser) {
          console.log(`[${requestId}] ❌ User not found for slug: ${slug}`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const result = await getUserTopStats(
          existingUser,
          time_range,
          limit ?? 50,
          offset ?? 50
        );

        const { user } = await getCurrentSession();

        const privacySettings = {
          tracks:
            existingUser.flags &&
            hasPrivacyFlag(existingUser.flags, PRIVACY_FLAGS.TOP_TRACKS),
          albums:
            existingUser.flags &&
            hasPrivacyFlag(existingUser.flags, PRIVACY_FLAGS.TOP_ALBUMS),
          artists:
            existingUser.flags &&
            hasPrivacyFlag(existingUser.flags, PRIVACY_FLAGS.TOP_ARTISTS),
          genres:
            existingUser.flags &&
            hasPrivacyFlag(existingUser.flags, PRIVACY_FLAGS.TOP_GENRES),
        };

        const filterStatsByPrivacy = (statsData: StatsResponse) => ({
          tracks: privacySettings.tracks ? [] : statsData.tracks,
          albums: privacySettings.albums ? [] : statsData.albums,
          artists: privacySettings.artists ? [] : statsData.artists,
          genres: privacySettings.genres ? [] : statsData.genres,
        });

        if (!user || user.id !== existingUser.id)
          return {
            stats: filterStatsByPrivacy(result.stats),
            user: result.user,
          };

        return result;
      } catch (err) {
        console.error(`[${requestId}] ❌ ERROR:`, err);
        console.log(
          `[${requestId}] ========= REQUEST ERROR END (${Date.now() - startTime}ms) =========\n`
        );

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while fetching data",
          cause: err,
        });
      }
    }),
  recentlyPlayed: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input: { slug } }) => {
      const existingUser = await db.query.users.findFirst({
        where: (fields, { eq }) => eq(fields.slug, slug),
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const { user } = await getCurrentSession();

      const isPrivacyEnabled = hasPrivacyFlag(
        existingUser.flags,
        PRIVACY_FLAGS.RECENTLY_PLAYED
      );

      if (isPrivacyEnabled && (!user || user.id !== existingUser.id)) return [];

      const cacheKey = CACHE_KEYS.recentlyPlayed(existingUser.spotifyId);
      const cached = (await redis.get(cacheKey)) as {
        orderedItems: RecentlyPlayed[];
      };

      if (cached) return cached.orderedItems;

      const accessToken = await getValidSpotifyToken(existingUser.id);

      const recentlyPlayedRequest = new Request(
        `${SPOTIFY_BASE_API}/me/player/recently-played?limit=50`
      );

      recentlyPlayedRequest.headers.set(
        "Authorization",
        `Bearer ${accessToken}`
      );

      const response = await fetch(recentlyPlayedRequest);

      if (!response.ok) {
        console.log(response);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch recently played tracks",
        });
      }

      const data = (await response.json()) as RecentlyPlayedResponse;

      const orderedItems = data.items.map((item) => ({
        name: item.track.name,
        artists: item.track.artists,
        album: item.track.album,
        id: item.track.id,
        playedAt: item.played_at,
      }));

      const consumer_api_data = data.items.map((recentlyPlayed) => ({
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

      await redis.set(
        cacheKey,
        { orderedItems, consumer_api_data },
        {
          ex: CACHE_TIMES.recentlyPlayed,
        }
      );

      return orderedItems;
    }),
  getPlayback: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const { userId } = input;
        const cacheKey = CACHE_KEYS.playback(userId);

        const cached = (await redis.get(cacheKey)) as Omit<
          PlaybackResponse,
          "device"
        > & { cachedAt: number };

        if (cached) {
          const updatedProgress =
            cached.progress_ms + (Date.now() - cached.cachedAt);

          return { ...cached, progress_ms: updatedProgress };
        }

        const existingUser = await db.query.users.findFirst({
          where: (fields, { eq }) => eq(fields.id, userId),
        });

        if (!existingUser)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });

        const accessToken = await getValidSpotifyToken(existingUser.id);

        const spotifyApi = new SpotifyAPI(accessToken);

        const data = await spotifyApi.getPlayback();

        if (!data) return null;

        const { device, ...rest } = data;

        if (device.is_private_session || !rest.is_playing) return null;

        const expirationSeconds = Math.max(
          1,
          Math.floor(((rest.item?.duration_ms || 0) - rest.progress_ms) / 1000)
        );

        await redis.set(
          cacheKey,
          { ...rest, cachedAt: Date.now() },
          {
            ex: expirationSeconds,
          }
        );

        return rest;
      } catch (err) {
        console.error(err);
        return null;
      }
    }),
  compare: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        timeRange: z.enum(TIME_RANGES).optional().default("short_term"),
      })
    )
    .query(async ({ input, ctx }) => {
      const { slug, timeRange } = input;

      const existingUser = await db.query.users.findFirst({
        where: (fields, { eq }) => eq(fields.slug, slug),
      });

      if (!existingUser)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });

      if (existingUser.id === ctx.user.id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot compare stats with yourself",
        });

      const targetStats = await getUserTopStats(existingUser, timeRange);
      const selfStats = await getUserTopStats(ctx.user, timeRange);

      const privacySettings = {
        tracks: !hasPrivacyFlag(existingUser.flags, PRIVACY_FLAGS.TOP_TRACKS),
        albums: !hasPrivacyFlag(existingUser.flags, PRIVACY_FLAGS.TOP_ALBUMS),
        artists: !hasPrivacyFlag(existingUser.flags, PRIVACY_FLAGS.TOP_ARTISTS),
        genres: !hasPrivacyFlag(existingUser.flags, PRIVACY_FLAGS.TOP_GENRES),
      };

      const mutualArtists = targetStats.stats.artists.filter((targetArtist) =>
        selfStats.stats.artists.some(
          (selfArtist) => selfArtist.id === targetArtist.id
        )
      );

      const mutualTracks = targetStats.stats.tracks.filter((targetTrack) =>
        selfStats.stats.tracks.some(
          (selfTrack) => selfTrack.id === targetTrack.id
        )
      );

      const mutualAlbums = targetStats.stats.albums.filter((targetAlbum) =>
        selfStats.stats.albums.some(
          (selfAlbum) => selfAlbum.id === targetAlbum.id
        )
      );

      const mutualGenres = targetStats.stats.genres.filter((targetGenre) =>
        selfStats.stats.genres.some((selfGenre) => selfGenre === targetGenre)
      );

      return {
        users: {
          target: existingUser,
          self: ctx.user,
        },
        similarities: {
          artists: privacySettings.artists
            ? mutualArtists
            : { message: "This user does not share artists" },
          tracks: privacySettings.tracks
            ? mutualTracks
            : { message: "This user does not share tracks" },
          albums: privacySettings.albums
            ? mutualAlbums
            : { message: "This user does not share albums" },
          genres: privacySettings.genres
            ? mutualGenres
            : { message: "This user does not share genres" },
        },
      };
    }),
  getPlaylists: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = CACHE_KEYS.userLibrary(ctx.user.id);
    const cache = await redis.get(cacheKey);

    if (cache) return cache as UserPlaylistsResponse["items"];

    const accessToken = await getValidSpotifyToken(ctx.user.id);

    const spotifyApi = new SpotifyAPI(accessToken);

    const playlists = await spotifyApi.getUserPlaylists(ctx.user.spotifyId);

    await redis.set(cacheKey, playlists.items, {
      ex: CACHE_TIMES.userLibrary,
    });

    return playlists.items;
  }),
  getPlaylistStats: protectedProcedure
    .input(z.object({ playlistId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { playlistId } = input;

      const cacheKey = CACHE_KEYS.playlist(ctx.user.id, playlistId);
      const cache = await redis.get(cacheKey);

      if (cache)
        return cache as Awaited<
          ReturnType<typeof getPlaylistAnalytics>
        >["data"];

      const accessToken = await getValidSpotifyToken(ctx.user.id);

      const { data, tracks } = await getPlaylistAnalytics(
        ctx.user.id,
        playlistId,
        accessToken
      );

      await redis.set(cacheKey, data, {
        ex: CACHE_TIMES.userPlaylist,
      });

      await redis.set(
        CACHE_KEYS.playlistTracks(ctx.user.id, playlistId),
        tracks,
        {
          ex: CACHE_TIMES.userPlaylist,
        }
      );

      return data;
    }),
  downloadPlaylist: protectedProcedure
    .input(
      z.object({ playlistId: z.string(), fileType: z.enum(["json", "csv"]) })
    )
    .mutation(async ({ input, ctx }) => {
      const { fileType, playlistId } = input;

      const cacheKey = CACHE_KEYS.playlistTracks(ctx.user.id, playlistId);
      const cache = (await redis.get(cacheKey)) as PlaylistItem[];

      if (cache) {
        const { downloadUrl, key } = await processAndUploadTracks(
          cache,
          fileType,
          playlistId
        );

        await saveExportToDb(db, key);

        return { downloadUrl };
      }

      const tracks = await fetchTracksFromSpotify(ctx.user.id, playlistId);

      await redis.set(cacheKey, tracks, {
        ex: CACHE_TIMES.userPlaylist,
      });

      const { downloadUrl, key } = await processAndUploadTracks(
        tracks,
        fileType,
        playlistId
      );

      await saveExportToDb(db, key);

      return { downloadUrl };
    }),
  removeDuplicates: protectedProcedure
    .input(z.object({ playlistId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { playlistId } = input;
        const userId = ctx.user.id;
        const cacheKey = CACHE_KEYS.playlistTracks(userId, playlistId);

        const cache = (await redis.get(cacheKey)) as PlaylistItem[];

        const accessToken = await getValidSpotifyToken(userId);
        const spotifyApi = new SpotifyAPI(accessToken);

        const tracks =
          cache ||
          (await fetchTracksFromSpotify(userId, playlistId, accessToken));

        const filteredTracks = removeDuplicatesAndGetTracks(tracks);
        const uniqueIds = filteredTracks.map(
          (track) => `spotify:track:${track.track.id}`
        );

        const allIds = tracks.map(
          (item) => `spotify:${item.track.type}:${item.track.id}`
        );

        await spotifyApi.removePlaylistItems(
          playlistId,
          allIds.map((id) => ({ uri: id }))
        );
        await spotifyApi.addPlaylistItems(playlistId, uniqueIds, {
          position: 0,
        });

        const newTracks = filteredTracks;

        await redis.set(cacheKey, newTracks, {
          ex: CACHE_TIMES.userPlaylist,
        });

        const playlistCacheKey = CACHE_KEYS.playlist(ctx.user.id, playlistId);
        const existingPlaylistCache = (await redis.get(
          playlistCacheKey
        )) as Awaited<ReturnType<typeof getPlaylistAnalytics>>["data"];

        if (existingPlaylistCache) {
          const updatedAnalytics = await calculatePlaylistAnalytics(
            newTracks,
            accessToken
          );

          const updatedCacheData = {
            ...updatedAnalytics,
            playlist: existingPlaylistCache.playlist,
          };

          console.log(updatedCacheData, "VS", existingPlaylistCache);

          await redis.set(playlistCacheKey, updatedCacheData, {
            ex: CACHE_TIMES.userPlaylist,
          });
        }

        revalidatePath(`/my-stuff/playlist/${playlistId}`);

        return { success: true };
      } catch (err) {
        console.error(err);
        return { success: false };
      }
    }),
  recentlyPlayedActions: protectedProcedure
    .input(
      z.object({
        playlistId: z.string().optional(),
        action: z.enum(["add-to-playlist", "add-to-likes", "create-playlist"]),
        trackIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { action, trackIds } = input;

      const accessToken = await getValidSpotifyToken(ctx.user.id);
      const spotifyApi = new SpotifyAPI(accessToken);

      switch (action) {
        case "create-playlist": {
          const playlist = await spotifyApi.createPlaylist({
            name: "Recently Played",
            description: "Tracks from your recently played",
            public: false,
            userId: ctx.user.spotifyId,
          });

          await spotifyApi.addPlaylistItems(playlist.id, trackIds);
          break;
        }
        case "add-to-playlist": {
          if (!input.playlistId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Playlist ID is required for this action",
            });
          }

          const { data: playlist, error } = await tryCatch(
            spotifyApi.getPlaylist(input.playlistId)
          );

          if (error) {
            console.error("Error fetching playlist:", error);
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Playlist not found",
            });
          }

          await spotifyApi.addPlaylistItems(
            playlist.id,
            trackIds.map((id) => `spotify:track:${id}`)
          );
          break;
        }
        case "add-to-likes": {
          await spotifyApi.addToLibrary(trackIds);
          break;
        }
      }
    }),
  sortPlaylistByArtist: protectedProcedure
    .input(
      z.object({
        playlistId: z.string(),
        playlistName: z.string(),
        createNew: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { playlistId, playlistName, createNew } = input;
        const userId = ctx.user.id;
        const cacheKey = CACHE_KEYS.playlistTracks(userId, playlistId);

        const cache = (await redis.get(cacheKey)) as PlaylistItem[];

        const accessToken = await getValidSpotifyToken(userId);
        console.log(accessToken);
        const spotifyApi = new SpotifyAPI(accessToken);

        const tracks =
          cache ||
          (await fetchTracksFromSpotify(userId, playlistId, accessToken));

        const filteredTracks = groupTracksByArtist(tracks);
        const uniqueIds = filteredTracks.map(
          (track) => `spotify:track:${track.track.id}`
        );

        const allIds = tracks.map(
          (item) => `spotify:${item.track.type}:${item.track.id}`
        );

        const newTracks = filteredTracks;

        if (createNew) {
          console.log(ctx.user.id);
          const data = await spotifyApi.createPlaylist({
            name: `Sorted - ${playlistName}`,
            description: "Generated by stats.skylerx.ir, grouped by artists",
            public: false,
            userId: ctx.user.spotifyId,
          });

          for (const chunk of chunks(uniqueIds, 100)) {
            await spotifyApi.addPlaylistItems(data.id, chunk, {
              position: 0,
            });
            await sleep(500);
          }
        } else {
          await spotifyApi.removePlaylistItems(
            playlistId,
            allIds.map((id) => ({ uri: id }))
          );
          await spotifyApi.addPlaylistItems(playlistId, uniqueIds, {
            position: 0,
          });
        }

        await redis.set(cacheKey, newTracks, {
          ex: CACHE_TIMES.userPlaylist,
        });

        const playlistCacheKey = CACHE_KEYS.playlist(ctx.user.id, playlistId);
        const existingPlaylistCache = (await redis.get(
          playlistCacheKey
        )) as Awaited<ReturnType<typeof getPlaylistAnalytics>>["data"];

        if (existingPlaylistCache) {
          const updatedAnalytics = await calculatePlaylistAnalytics(
            newTracks,
            accessToken
          );

          const updatedCacheData = {
            ...updatedAnalytics,
            playlist: existingPlaylistCache.playlist,
          };

          console.log(updatedCacheData, "VS", existingPlaylistCache);

          await redis.set(playlistCacheKey, updatedCacheData, {
            ex: CACHE_TIMES.userPlaylist,
          });
        }

        return { success: true };
      } catch (err) {
        console.error("SORT ERROR", err);
        return { success: false };
      }
    }),
});

function convertJSONToCSV(data: Record<string, unknown>[]) {
  if (data.length === 0) return "";

  const headers = data[0] ? Object.keys(data[0]) : [];
  const csvRows = [];

  csvRows.push(headers.join(","));

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

async function processAndUploadTracks(
  tracks: PlaylistItem[],
  fileType: string,
  playlistId: string
): Promise<{ downloadUrl: string; key: string }> {
  const fileData = formatTracksForExport(tracks, fileType, playlistId);
  const { downloadUrl, key } = await uploadFileToS3(fileData);

  return { downloadUrl, key };
}

function formatTracksForExport(
  tracks: PlaylistItem[],
  fileType: string,
  playlistId: string
): FileContent {
  const formattedData = tracks.map((item) => ({
    is_local: item.is_local,
    trackName: item.track.name,
    spotifyTrackId: item.track.id,
    trackArtist: item.track.artists[0]?.name,
    trackArtistId: item.track.artists[0]?.id,
    trackImageUrl: item.track.album.images[0]?.url,
    addedBy: item.added_by.id,
  }));

  if (fileType === "csv") {
    return {
      fileContent: convertJSONToCSV(formattedData),
      fileName: `data-export_${playlistId}.csv`,
      contentType: "text/csv",
    };
  }

  return {
    fileContent: formattedData,
    fileName: `data-export_${playlistId}.json`,
    contentType: "application/json",
  };
}

async function uploadFileToS3(
  data: FileContent
): Promise<{ downloadUrl: string; key: string }> {
  const key = `downloads/${randomUUID()}/${data.fileName}`;
  const fileContent = serializeFileContent(data.fileContent);

  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: data.contentType,
  });

  await s3.send(command);

  const getCommand = new GetObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
  });

  // biome-ignore lint/suspicious/noExplicitAny: Tried everything, for some reason it just doesn't understand that its the correct type
  const downloadUrl = await getSignedUrl(s3 as any, getCommand, {
    expiresIn: 3600,
  });

  return { downloadUrl, key };
}

async function saveExportToDb(db: typeof DBType, s3Key: string) {
  await db.insert(downloadExports).values({
    s3Key,
  });
}

function removeDuplicatesAndGetTracks(items: PlaylistItem[]): PlaylistItem[] {
  const seen = new Set<string>();
  const uniqueTracks: PlaylistItem[] = [];

  for (const item of items) {
    if (!seen.has(item.track.id)) {
      seen.add(item.track.id);
      uniqueTracks.push(item);
    }
  }

  return uniqueTracks;
}

interface PlaylistItemMap extends PlaylistItem {
  index: number;
}

function groupTracksByArtist(items: PlaylistItem[]): PlaylistItem[] {
  let artistCount = 0;

  const artistIndexMap = new Map<string, number>();
  const artistsMap = new Map<string, PlaylistItemMap[]>();

  for (const item of items) {
    const artist = item.track.artists[0]!;

    if (!artistIndexMap.has(artist.id)) {
      artistCount++;
      artistIndexMap.set(artist.id, artistCount);
    }

    const index = artistIndexMap.get(artist.id)!;

    const data: PlaylistItemMap = { ...item, index };

    const arr = artistsMap.get(artist.id) || [];
    arr.push(data);
    artistsMap.set(artist.id, arr);
  }

  return Array.from(artistsMap, ([key, value]) => ({
    key,
    value: value.sort((a, b) => {
      const albumCompare = a.track.album.name.localeCompare(b.track.album.name);
      if (albumCompare !== 0) return albumCompare;
      return a.track.album.name.localeCompare(b.track.album.name);
    }),
    index: artistIndexMap.get(key)!,
  }))
    .sort((a, b) => a.index - b.index)
    .flatMap((group) => group.value);
}

function serializeFileContent(fileContent: unknown): Buffer {
  const stringContent =
    Array.isArray(fileContent) || typeof fileContent === "object"
      ? JSON.stringify(fileContent)
      : fileContent;

  return Buffer.from(stringContent as string);
}

type FileContent = {
  contentType: string;
  fileContent: unknown;
  fileName: string;
};
