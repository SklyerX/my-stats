import "server-only";

import type {
  Artist,
  PlaylistItem,
  SimplifiedArtist,
  SpotifyImage,
} from "@/types/spotify";
import { artists } from "@workspace/database/schema";
import { inArray } from "@workspace/database/drizzle";
import { SpotifyAPI } from "@/lib/spotify/api";
import { processArtistTask } from "@/trigger/process-artist";
import { db } from "@workspace/database/connection";
import { fetchTracksFromSpotify } from "./tracks";

export type ArtistMapValue = SimplifiedArtist & {
  count: number;
};

type EnhancedArtist = ArtistMapValue & {
  images: SpotifyImage[];
};

export async function calculatePlaylistAnalytics(
  tracks: PlaylistItem[],
  accessToken: string,
): Promise<{
  totalTracks: number;
  totalDurationMs: number;
  popularDates: { year: number; count: number }[];
  popularArtists: EnhancedArtist[];
}> {
  let totalDurationMs = 0;
  const datesMap = new Map<number, number>();
  const artistsMap = new Map<string, ArtistMapValue>();
  const totalTracks = tracks.length;

  for (const content of tracks) {
    const addedAtDate = new Date(content.added_at);
    const dateMapKey = addedAtDate.getFullYear();

    const mainArtist = content.track.album.artists[0];
    if (!mainArtist) continue;

    const mainArtistCount = artistsMap.get(mainArtist.id)?.count || 0;

    datesMap.set(dateMapKey, (datesMap.get(dateMapKey) || 0) + 1);
    artistsMap.set(mainArtist.id, {
      ...mainArtist,
      count: mainArtistCount + 1,
    });

    totalDurationMs += content.track.duration_ms;
  }

  const popularDates = Array.from(datesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([year, count]) => ({ year, count }));

  const popularArtists = Array.from(artistsMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, data]) => data);

  const enhancedPopularArtists = await enhanceArtistsWithImages(
    popularArtists,
    accessToken,
  );

  return {
    totalTracks,
    totalDurationMs,
    popularDates,
    popularArtists: enhancedPopularArtists,
  };
}

async function enhanceArtistsWithImages(
  popularArtists: ArtistMapValue[],
  accessToken: string,
): Promise<EnhancedArtist[]> {
  const artistIds = popularArtists.map((artist) => artist.id);

  const existingArtists = await db
    .select()
    .from(artists)
    .where(inArray(artists.artistId, artistIds));

  const existingIds = existingArtists.map((artist) => artist.artistId);
  const missingArtists = artistIds.filter((id) => !existingIds.includes(id));

  let fetchedArtists: Artist[] = [];

  if (missingArtists.length > 0) {
    const spotifyApi = new SpotifyAPI(accessToken);
    fetchedArtists = await spotifyApi.getMultipleArtists(missingArtists);

    await processArtistTask.trigger({
      accessToken,
      artists: fetchedArtists,
    });
  }

  const artistDetailsMap = new Map();

  for (const artist of existingArtists) {
    artistDetailsMap.set(artist.artistId, {
      imageUrl: artist.imageUrl,
    });
  }

  if (fetchedArtists.length > 0) {
    for (const artist of fetchedArtists.filter((a) => a)) {
      artistDetailsMap.set(artist.id, {
        images: artist.images,
      });
    }
  }

  return popularArtists.map((artist) => {
    const detailedInfo = artistDetailsMap.get(artist.id);

    if (!detailedInfo) {
      return {
        ...artist,
        images: [],
      };
    }

    let normalizedImages: SpotifyImage[] = [];

    if ("imageUrl" in detailedInfo) {
      normalizedImages = detailedInfo.imageUrl
        ? [{ url: detailedInfo.imageUrl, height: null, width: null }]
        : [];
    } else if ("images" in detailedInfo) {
      normalizedImages = detailedInfo.images;
    }

    return {
      ...artist,
      images: normalizedImages,
    };
  });
}

export async function getPlaylistAnalytics(
  userId: string,
  playlistId: string,
  accessToken: string,
) {
  const spotifyApi = new SpotifyAPI(accessToken);
  const playlistContent = await spotifyApi.getPlaylistContent(playlistId);
  const tracks = await fetchTracksFromSpotify(userId, playlistId);

  const analytics = await calculatePlaylistAnalytics(tracks, accessToken);

  const data = {
    ...analytics,
    playlist: {
      name: playlistContent.name,
      description: playlistContent.description,
      images: playlistContent.images,
    },
  };

  return { data, tracks };
}
