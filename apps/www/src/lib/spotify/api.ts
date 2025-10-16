import type {
  UserPlaylistsResponse,
  AlbumResponse,
  Artist,
  ArtistAlbumsResponse,
  ArtistTopTracksResponse,
  RecentlyPlayedResponse,
  SearchContentParams,
  SearchContentResponse,
  Track,
  SavedTracksResponse,
  PlaylistContentResponse,
  PlaybackResponse,
  PlaylistDetailsResponse,
} from "@/types/spotify";
import { SPOTIFY_BASE_API } from "../constants";
import { tryCatch } from "../try-catch";

interface SearchOptions extends Omit<SearchContentParams, "query" | "type"> {
  limit?: number;
  offset?: number;
}

export class SpotifyAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, params?: Record<string, unknown>) {
    const queryParams = new URLSearchParams();

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (!value) continue;
        queryParams.set(key, value.toString());
      }
    }

    const request = new Request(
      `${SPOTIFY_BASE_API}${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    );

    request.headers.set("Authorization", `Bearer ${this.accessToken}`);

    const response = await fetch(request);

    if (!response.ok) {
      console.log(response);
      console.log(response.headers);
      console.log("FULL URL", response.url);
      throw new Error(`Failed to fetch ${endpoint}`);
    }

    return response.json() as T;
  }

  async getArtistTopTracks(artistId: string) {
    const topTracks = await this.request<ArtistTopTracksResponse>(
      `/artists/${artistId}/top-tracks?market=US`
    );
    return topTracks;
  }

  async getArtistAlbums(artistId: string) {
    const albums = await this.request<ArtistAlbumsResponse>(
      `/artists/${artistId}/albums?include_groups=album,single&limit=20`
    );
    return albums;
  }

  async getArtist(artistId: string) {
    const artist = await this.request<Artist>(`/artists/${artistId}`);
    return artist;
  }

  async getMultipleArtists(artistIds: string[]) {
    const data = await this.request<{ artists: Artist[] }>(
      `/artists?ids=${artistIds.join(",")}`
    );
    return data.artists;
  }

  async getMultipleTracks(trackIds: string[]) {
    const data = await this.request<{ tracks: Track[] }>(
      `/tracks?ids=${trackIds.join(",")}`
    );
    return data.tracks;
  }

  async searchArtist({
    query,
    limit = 50,
    type = ["artist"],
    offset = 0,
    market,
    include_external,
  }: SearchContentParams): Promise<SearchContentResponse> {
    const search = await this.request<SearchContentResponse>("/search", {
      q: query,
      limit,
      type,
      offset,
      market,
      include_external,
    });

    return search;
  }

  async getTrack(trackId: string) {
    const track = await this.request<Track>(`/tracks/${trackId}`);
    return track;
  }

  async getAlbum(albumId: string) {
    const album = await this.request<AlbumResponse>(`/albums/${albumId}`);
    return album;
  }

  async getPlayback() {
    const { data, error } = await tryCatch(
      this.request<PlaybackResponse>("/me/player")
    );

    if (error) return null;

    return data;
  }

  async getRecentlyPlayed(
    before: string | null,
    after: string | null,
    limit?: number
  ) {
    const { data, error } = await tryCatch(
      this.request<RecentlyPlayedResponse>("/me/player/recently-played", {
        before,
        after,
        limit,
      })
    );

    if (error) return null;

    return data.items;
  }

  async searchAll(
    query: string,
    type: ["track", "artist", "album"],
    options: SearchOptions
  ): Promise<SearchContentResponse> {
    const search = await this.request<SearchContentResponse>("/search", {
      q: query,
      type,
      ...options,
    });

    return search;
  }

  async getUserPlaylists(userId: string, options?: SearchOptions) {
    const playlists = await this.request<UserPlaylistsResponse>(
      `/users/${userId}/playlists`,
      {
        ...options,
      }
    );
    return playlists;
  }

  async getUserSavedTracks(options?: SearchOptions) {
    const savedTracks = await this.request<SavedTracksResponse>("/me/tracks", {
      ...options,
    });
    return savedTracks;
  }

  async getPlaylistContent(playlistId: string) {
    const content = await this.request<PlaylistContentResponse>(
      `/playlists/${playlistId}`
    );
    return content;
  }

  async getPlaylist(playlistId: string): Promise<PlaylistDetailsResponse> {
    const playlist = await this.request<PlaylistDetailsResponse>(
      `/playlists/${playlistId}`
    );

    return playlist;
  }

  async removePlaylistItems(playlistId: string, uris: { uri: string }[]) {
    const request = new Request(
      `${SPOTIFY_BASE_API}/playlists/${playlistId}/tracks`
    );

    request.headers.set("Authorization", `Bearer ${this.accessToken}`);
    request.headers.set("Content-Type", "application/json");

    const response = await fetch(request, {
      method: "DELETE",
      body: JSON.stringify({
        tracks: uris,
      }),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return response.json();
  }

  async addPlaylistItems(
    playlistId: string,
    uris: string[],
    data: { position?: number } = {}
  ) {
    const request = new Request(
      `${SPOTIFY_BASE_API}/playlists/${playlistId}/tracks`
    );

    request.headers.set("Authorization", `Bearer ${this.accessToken}`);
    request.headers.set("Content-Type", "application/json");

    const response = await fetch(request, {
      method: "POST",
      body: JSON.stringify({
        uris,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.log("Error response body:", errorBody);
      throw new Error(`Failed to add playlist items -> ${response.statusText}`);
    }

    return response.json();
  }

  async createPlaylist(data: {
    name: string;
    description: string;
    public: boolean;
    userId: string;
  }): Promise<PlaylistDetailsResponse> {
    const request = new Request(
      `${SPOTIFY_BASE_API}/users/${data.userId}/playlists`
    );

    request.headers.set("Authorization", `Bearer ${this.accessToken}`);
    request.headers.set("Content-Type", "application/json");

    const response = await fetch(request, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.log("Error response body:", errorBody);
      throw new Error(`Failed to create a playlist -> ${response.statusText}`);
    }

    const responseData = (await response.json()) as PlaylistDetailsResponse;

    return responseData;
  }

  async addToLibrary(ids: Array<string>): Promise<{ success: boolean }> {
    // Add some logging to see what's actually happening
    console.log("Access token:", this.accessToken?.substring(0, 20) + "...");
    console.log("Track IDs:", ids);
    console.log(
      "Full URL:",
      `${SPOTIFY_BASE_API}/me/tracks?ids=${ids.join(",")}`
    );

    const request = new Request(
      `${SPOTIFY_BASE_API}/me/tracks?ids=${ids.join(",")}`,
      {
        method: "PUT",
      }
    );

    request.headers.set("Authorization", `Bearer ${this.accessToken}`);
    request.headers.set("Content-Type", "application/json");

    const response = await fetch(request);

    // Log the full response details
    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.log("Error response body:", errorBody);
      throw new Error(`Failed to add to library -> ${response.statusText}`);
    }

    return { success: true };
  }
}
