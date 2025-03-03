import type { TIME_RANGE } from "@/types/spotify";

export const SPOTIFY_BASE_API = "https://api.spotify.com/v1";

export const CACHE_KEYS = {
  top: (userId: string, time_range: TIME_RANGE) =>
    `top:${userId}:${time_range}`,
  recentlyPlayed: (userId: string) => `recently-played:${userId}`,
  artistStats: (artistId: string) => `artist-stats:${artistId}`,
  artistsQueue: (artistId: string) => `artist-stats-queue:${artistId}`,
  systemSpotifyToken: () => "system_spotify_token",
  relatedArtist: (artistId: string) => `related-artist:${artistId}`,
  relatedArtistQueue: (artistId: string) => `related-artist-queue:${artistId}`,
  trackAudioFeatures: (trackId: string) => `track-audio-features:${trackId}`,
  trackAudioFeaturesQueue: (trackId: string) =>
    `track-audio-features-queue:${trackId}`,
};

export const CACHE_TIMES = {
  short_term: 1200,
  medium_term: 7200,
  long_term: 14400,
  recentlyPlayed: 600,
  artistStats: 604800,
  relatedArtists: 604800,
  relatedArtistsQueue: 300,
  trackAudioFeatures: 86400,
  trackAudioFeaturesQueue: 300,
};

export const TIME_RANGE_TEXT: Record<TIME_RANGE, string> = {
  short_term: "4 Weeks",
  medium_term: "6 Months",
  long_term: "Year",
};
