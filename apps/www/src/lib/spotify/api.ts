import type {
  Artist,
  ArtistAlbumsResponse,
  ArtistTopTracksResponse,
  SearchContentParams,
  SearchContentResponse,
} from "@/types/spotify";
import { SPOTIFY_BASE_API } from "../constants";

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
    console.log("Currently in API", artistId);
    const artist = await this.request<Artist>(`/artists/${artistId}`);
    return artist;
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
}
