import type {
  PlaylistTracksResponse,
  RecentlyPlayedResponse,
  SavedTracksResponse,
  SimplifiedPlaylist,
  StatsResponse,
  TIME_RANGE,
  TopArtistsResponse,
  TopTracksResponse,
  UserPlaylistsResponse,
} from "@/types/spotify";
import { SPOTIFY_BASE_API } from "../constants";
import { calculateTopGenres } from "./calculations";
import { AlbumRankingSystem } from "./album-ranking-system";

export class TopStatsAnalyzer {
  constructor(
    private token: string,
    private spotifyUserId: string,
  ) {}

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
    const [topTracks, topArtists, recentTracks, playlists, savedTracks] =
      await Promise.all([
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
        this.makeRequest<SavedTracksResponse>("/me/tracks?limit=50"),
      ]);

    const prioritizePlaylists = playlists.items
      .sort((a, b) => {
        const scoreA =
          (a.owner.id === this.spotifyUserId ? 50 : 0) +
          (a.tracks.total || 0) * 0.1 +
          (a.collaborative ? -10 : 0);
        const scoreB =
          (b.owner.id === this.spotifyUserId ? 50 : 0) +
          (b.tracks.total || 0) * 0.1 +
          (b.collaborative ? -10 : 0);

        return scoreB - scoreA;
      })
      .slice(0, 5);

    const playlistTracksResponses = await Promise.all(
      prioritizePlaylists.map((playlist: SimplifiedPlaylist) =>
        this.makeRequest<PlaylistTracksResponse>(
          `/playlists/${playlist.id}/tracks?limit=50`,
        ),
      ),
    );

    const playlistTracks = playlistTracksResponses.flatMap(
      (response) => response.items,
    );

    const rankingSystem = new AlbumRankingSystem();

    const topAlbums = await rankingSystem.getTopAlbums({
      topTracks: topTracks.items.map((track, i) => ({
        position: i + 1,
        ...track,
      })),
      playlists: playlistTracks,
      recentlyPlayed: recentTracks.items.map((x) => ({
        track: x.track,
        played_at: x.played_at,
        context: x.context,
      })),
      savedTracks: savedTracks.items.map((savedTrack) => savedTrack.track),
    });

    const genreCounts = this.calculateTopGenres(
      topArtists.items.flatMap((artist) => artist.genres),
    );

    const cleanedTracks = this.cleanJsonData(topTracks, [
      "available_markets",
      "external_urls",
      "preview_url",
    ]);

    const cleanedAlbums = this.cleanJsonData(topAlbums, [
      "available_markets",
      "external_urls",
      "preview_url",
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
