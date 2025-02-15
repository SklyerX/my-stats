import type {
  AlbumStats,
  Artist,
  PlaylistTracksResponse,
  RecentlyPlayedResponse,
  SimplifiedPlaylist,
  StatsResponse,
  TIME_RANGE,
  TopArtistsResponse,
  TopTracksResponse,
  Track,
  UserPlaylistsResponse,
} from "@/types/spotify";
import { SPOTIFY_BASE_API } from "../constants";
import { calculateTopGenres } from "./calculations";

export class TopStatsAnalyzer {
  constructor(private token: string) {}

  private async makeRequest<T>(endpoint: string) {
    const request = new Request(`${SPOTIFY_BASE_API}${endpoint}`);
    request.headers.set("Authorization", `Bearer ${this.token}`);

    const response = await fetch(request);
    if (!response.ok) {
      console.log(response);
      throw new Error(`Failed to fetch ${endpoint}`);
    }

    return response.json() as T;
  }

  async getStatistics(
    time_range: TIME_RANGE,
    limit = 50,
    offset = 0,
  ): Promise<StatsResponse> {
    const [topTracks, topArtists, recentTracks, playlists] = await Promise.all([
      this.makeRequest<TopTracksResponse>(
        `/me/top/tracks?time_range=${time_range}&limit=${limit}&offset=${offset}`,
      ),
      this.makeRequest<TopArtistsResponse>(
        `/me/top/artists?time_range=${time_range}&limit=${limit}&offset=${offset}`,
      ),
      this.makeRequest<RecentlyPlayedResponse>(
        "/me/player/recently-played?limit=50",
      ),
      this.makeRequest<UserPlaylistsResponse>("/me/playlists?limit=50"),
    ]);

    const albumMap = new Map<string, AlbumStats>();

    for (const track of topTracks.items) {
      if (!albumMap.has(track.album.id)) {
        albumMap.set(track.album.id, {
          ...track.album,
          artists: track.artists,
          occurrences: 1,
        });
      } else {
        const album = albumMap.get(track.album.id) as AlbumStats;
        album.occurrences += 1;
      }
    }

    for (const item of recentTracks.items) {
      if (!albumMap.has(item.track.album.id)) {
        albumMap.set(item.track.album.id, {
          ...item.track.album,
          artists: item.track.artists,
          occurrences: 1,
        });
      } else {
        const albumStats = albumMap.get(item.track.album.id)!;
        albumStats.occurrences += 1;
      }
    }

    const playlistTracks = await Promise.all(
      playlists.items
        .slice(0, 5)
        .map((playlist: SimplifiedPlaylist) =>
          this.makeRequest<PlaylistTracksResponse>(
            `/playlists/${playlist.id}/tracks?limit=50`,
          ),
        ),
    );

    for (const data of playlistTracks) {
      for (const { track } of data.items) {
        if (!albumMap.has(track.album.id)) {
          albumMap.set(track.album.id, {
            ...track.album,
            artists: track.artists,
            occurrences: 1,
          });
        } else {
          const albumStats = albumMap.get(track.album.id)!;
          albumStats.occurrences += 1;
        }
      }
    }

    const genreCounts = this.calculateTopGenres(
      topArtists.items.flatMap((artist) => artist.genres),
    );

    const sortedAlbums = Array.from(albumMap.values()).sort(
      (a, b) => b.occurrences - a.occurrences,
    );

    const cleanedTracks = this.cleanJsonData(topTracks, [
      "available_markets",
      "external_urls",
      "preview_url",
    ]);

    const cleanedAlbums = this.cleanJsonData(sortedAlbums, [
      "available_markets",
      "external_urls",
    ]);

    return {
      tracks: cleanedTracks.items,
      artists: topArtists.items,
      albums: cleanedAlbums,
      genres: genreCounts,
    };
  }

  private calculateTopGenres(genres: string[]): string[] {
    return calculateTopGenres(genres);
  }

  private cleanJsonData(data: unknown, keys: string[]) {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        keys.includes(key) ? undefined : value,
      ),
    );
  }
}
