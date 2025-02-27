import type { LastFmCacheEntry } from "@/types/last-fm";
import { CACHE_KEYS, CACHE_TIMES } from "../constants";
import { redis } from "../redis";
import { LastFmClient } from "./client";

export class LastFMBridge {
  private client: LastFmClient;
  private API_KEY: string;

  constructor(API_KEY: string) {
    this.API_KEY = API_KEY;
    this.client = new LastFmClient(this.API_KEY);
  }

  /* 
    Weird function I get it but its needed to be 100% accurate and to be able to hit the last.fm API
    The core purpose of this function is to check existing cached *dedicated* to last.fm by using the Spotify  
  */
  async getSimilarArtistsBySpotifyId(spotifyName: string) {
    try {
      const relatedArtists = await this.client.getRelatedArtists(spotifyName);
      const artistInfo = await this.client.searchArtist(spotifyName);

      const cache_entry = {
        name: spotifyName,
        mbid: artistInfo?.mbid,
        relatedArtists: relatedArtists.map((a) => ({
          name: a.name,
          mbid: a.mbid,
          url: a.url,
          match: a.match || "0",
          image: a.image?.[0]?.["#text"] || null,
        })),
        timestamp: new Date(),
      };

      return cache_entry.relatedArtists;
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}
