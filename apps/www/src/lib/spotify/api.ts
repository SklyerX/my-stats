import type {
  AlbumResponse,
  Artist,
  ArtistAlbumsResponse,
  ArtistTopTracksResponse,
  PlaybackResponse,
  RecentlyPlayedResponse,
  SearchContentParams,
  SearchContentResponse,
  Track,
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
      `${SPOTIFY_BASE_API}${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
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
      `/artists/${artistId}/top-tracks?market=US`,
    );
    return topTracks;
  }

  async getArtistAlbums(artistId: string) {
    const albums = await this.request<ArtistAlbumsResponse>(
      `/artists/${artistId}/albums?include_groups=album,single&limit=20`,
    );
    return albums;
  }

  async getArtist(artistId: string) {
    const artist = await this.request<Artist>(`/artists/${artistId}`);
    return artist;
  }

  async getMultipleArtists(artistIds: string[]) {
    const data = await this.request<{ artists: Artist[] }>(
      `/artists?ids=${artistIds.join(",")}`,
    );
    return data.artists;
  }

  async getMultipleTracks(trackIds: string[]) {
    const data = await this.request<{ tracks: Track[] }>(
      `/tracks?ids=${trackIds.join(",")}`,
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
      this.request<PlaybackResponse>("/me/player"),
    );

    if (error) return null;

    return data;
  }

  async getRecentlyPlayed(
    before: string | null,
    after: string | null,
    limit?: number,
  ) {
    const { data, error } = await tryCatch(
      this.request<RecentlyPlayedResponse>("/me/player/recently-played", {
        before,
        after,
        limit,
      }),
    );

    if (error) return null;

    return data.items;
  }

  async searchAll(
    query: string,
    type: ["track", "artist", "album"],
    options: SearchOptions,
  ): Promise<SearchContentResponse> {
    const search = await this.request<SearchContentResponse>("/search", {
      q: query,
      type,
      ...options,
    });

    return search;
  }
}
