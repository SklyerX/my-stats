import type { InternalTopUserStats } from "@/types/response";
import { CACHE_KEYS, CACHE_TIMES } from "../constants";
import { redis } from "../redis";
import { getValidSpotifyToken } from "./tokens";
import { TopStatsAnalyzer } from "./top-stats-analyzer";
import { processArtistTask } from "@/trigger/process-artist";
import type {
  Album,
  Artist,
  PlaylistContentResponse,
  PlaylistItem,
  StatsResponse,
  TIME_RANGE,
  Track,
} from "@/types/spotify";
import type { User } from "@workspace/database/schema";
import { isDataVisible, PRIVACY_FLAGS } from "../flags";
import { SpotifyAPI } from "./api";
import { sleep } from "../utils";

export async function getUserTopStats(
  user: User,
  timeRange: TIME_RANGE = "short_term",
  limit = 50,
  offset = 0,
  albumLimit = 50,
) {
  const cacheKey = CACHE_KEYS.top(user.spotifyId, timeRange);
  const cached = await redis.get(cacheKey);

  if (cached) {
    return {
      stats: cached,
      user: {
        image: user.image,
        name: user.username,
        bio: user.bio,
        id: user.id,
        flags: user.flags,
      },
    } as InternalTopUserStats;
  }

  const accessToken = await getValidSpotifyToken(user.id);

  const analyzer = new TopStatsAnalyzer(accessToken, user.spotifyId);

  const stats = await analyzer.getStatistics(
    timeRange,
    limit,
    offset,
    albumLimit,
  );

  await processArtistTask.trigger({
    artists: stats.artists,
    accessToken,
  });

  await redis.set(cacheKey, stats, {
    ex: CACHE_TIMES[timeRange],
  });

  return {
    stats,
    user: {
      image: user.image,
      name: user.username,
      bio: user.bio,
      id: user.id,
      flags: user.flags,
    },
  } as InternalTopUserStats;
}

export type StatsField = "tracks" | "albums" | "artists" | "genres";

export async function getUserTopStatsWithFieldsAndPrivacy(
  user: User,
  flags: number,
  fields: StatsField[] = ["tracks", "albums", "artists", "genres"],
  timeRange: TIME_RANGE = "short_term",
  limit = 50,
  offset = 0,
  albumLimit = 50,
) {
  const result = await getUserTopStats(
    user,
    timeRange,
    limit,
    offset,
    albumLimit,
  );

  const privacySettings = {
    tracks: isDataVisible(flags, PRIVACY_FLAGS.TOP_TRACKS),
    albums: isDataVisible(flags, PRIVACY_FLAGS.TOP_ALBUMS),
    artists: isDataVisible(flags, PRIVACY_FLAGS.TOP_ARTISTS),
    genres: isDataVisible(flags, PRIVACY_FLAGS.TOP_GENRES),
  };

  const filteredStats: Partial<StatsResponse> = {};

  if (fields.includes("tracks")) {
    filteredStats.tracks = privacySettings.tracks
      ? (buildResponse("tracks", result.stats.tracks) ?? [])
      : [];
  }

  if (fields.includes("albums")) {
    filteredStats.albums = privacySettings.albums
      ? (buildResponse("albums", result.stats.albums) ?? [])
      : [];
  }

  if (fields.includes("artists")) {
    filteredStats.artists = privacySettings.artists
      ? (buildResponse("artists", result.stats.artists) ?? [])
      : [];
  }

  if (fields.includes("genres")) {
    filteredStats.genres = privacySettings.genres
      ? (result.stats.genres ?? [])
      : [];
  }

  return filteredStats;
}

const buildResponse = <T extends Artist | Track | Album>(
  type: "artists" | "tracks" | "albums",
  data: T | T[] | null,
): T[] | null => {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map((item) => buildResponseSingle(type, item) as unknown as T);
  }

  return [buildResponseSingle(type, data) as unknown as T];
};

const buildResponseSingle = (
  type: "artists" | "tracks" | "albums",
  data: Artist | Track | Album,
) => {
  if (type === "tracks") {
    const trackData = data as Track;
    return {
      name: trackData.name,
      album_name: trackData.album.name,
      cover_image: trackData.album.images.at(0)?.url,
      album_id: trackData.album.id,
      track_id: trackData.id,
      popularity: trackData.popularity,
      artists: trackData.artists.map((artist) => ({
        artistId: artist.id,
        name: artist.name,
      })),
    };
  }

  if (type === "artists") {
    const artistData = data as Artist;
    return {
      name: artistData.name,
      cover_image: artistData.images.at(0)?.url,
      artist_id: artistData.id,
      popularity: artistData.popularity,
      followers: artistData.followers.total,
      genres: artistData.genres,
    };
  }

  if (type === "albums") {
    const albumData = data as Album;
    return {
      album_title: albumData.name,
      album_id: albumData.id,
      album_type: albumData.album_type,
      cover_image: albumData.images.at(0)?.url,
      release_date: albumData.release_date,
      total_tracks: albumData.total_tracks,
      artists: albumData.artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),
    };
  }

  return null;
};

export async function fetchAllPlaylistTracks(
  playlistId: string,
  userId: string,
): Promise<PlaylistItem[]> {
  const accessToken = await getValidSpotifyToken(userId);
  const spotifyApi = new SpotifyAPI(accessToken);
  const playlistContent = await spotifyApi.getPlaylistContent(playlistId);

  const allTracks: PlaylistItem[] = [...playlistContent.tracks.items];

  if (playlistContent.tracks.next) {
    const additionalTracks = await fetchRemainingPlaylistTracks(
      playlistContent.tracks.next,
      accessToken,
    );
    allTracks.push(...additionalTracks);
  }

  return allTracks;
}

async function fetchRemainingPlaylistTracks(
  initialNextUrl: string,
  accessToken: string,
): Promise<PlaylistItem[]> {
  const collectedTracks: PlaylistItem[] = [];
  let nextUrl = initialNextUrl;

  while (nextUrl) {
    console.log("Fetching next page:", nextUrl);

    const req = new Request(nextUrl);
    req.headers.set("Authorization", `Bearer ${accessToken}`);
    const res = await fetch(req);

    if (!res.ok) break;

    const data = await res.json();
    const items = data.items || data.tracks?.items;

    if (!items) {
      console.error("Unexpected response structure:", Object.keys(data));
      break;
    }

    collectedTracks.push(...items);
    nextUrl = data.next || data.tracks?.next;

    if (nextUrl) await sleep(1000);
  }

  return collectedTracks;
}
