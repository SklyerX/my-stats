import type {
  ArtistAlbumsResponse,
  ArtistTopTracksResponse,
} from "@/types/spotify";
import { SPOTIFY_BASE_API } from "../constants";

export class SpotifyAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string) {
    const request = new Request(`${SPOTIFY_BASE_API}${endpoint}`);
    request.headers.set("Authorization", `Bearer ${this.accessToken}`);

    const response = await fetch(request);
    if (!response.ok) {
      console.log(response);
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
      `/artists/${artistId}/albums?include_groups=album,single&limit=50`,
    );
    return albums;
  }
}
