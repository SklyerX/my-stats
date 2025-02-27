import type {
  SearchArtistResponse,
  SimilarArtistsResponse,
} from "@/types/last-fm";

export class LastFmClient {
  private readonly API_KEY: string;
  private readonly BASE_URL: string;

  constructor(apiKey: string) {
    this.API_KEY = apiKey;
    this.BASE_URL = "https://ws.audioscrobbler.com/2.0";
  }

  private async request<T>(
    method: string,
    params: Record<string, string | number>,
  ) {
    const queryParams = new URLSearchParams();

    // Add required parameters
    queryParams.append("method", method);
    queryParams.append("api_key", this.API_KEY);
    queryParams.append("format", "json");

    // Add all other parameters
    for (const [key, value] of Object.entries(params)) {
      queryParams.append(key, value.toString());
    }

    const response = await fetch(`${this.BASE_URL}/?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`);
    }

    return response.json() as T;
  }

  async getRelatedArtists(artistName: string) {
    const response = await this.request<SimilarArtistsResponse>(
      "artist.getSimilar",
      {
        artist: artistName,
        limit: 25,
      },
    );

    return response.similarartists.artist.filter((a) => !a.name.includes("%"));
  }

  async searchArtist(spotifyArtistName: string) {
    const response = await this.request<SearchArtistResponse>("artist.search", {
      artist: spotifyArtistName,
      limit: 1,
    });

    const artists = response.results.artistmatches.artist || [];
    return artists.find((a) => a.mbid) || null;
  }
}
