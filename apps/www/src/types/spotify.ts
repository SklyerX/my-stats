export interface ExternalUrls {
  spotify: string;
}

export interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

export interface SimplifiedArtist {
  external_urls: ExternalUrls;
  href: string;
  id: string;
  name: string;
  type: "artist";
  uri: string;
}

export interface Album {
  album_type: "album" | "single" | "compilation";
  total_tracks: number;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  release_date: string;
  release_date_precision: "year" | "month" | "day";
  restrictions?: Restrictions;
  type: "album";
  uri: string;
  artists: SimplifiedArtist[];
}

export interface PlaylistOwner {
  external_urls: ExternalUrls;
  followers: {
    href: string;
    total: number;
  };
  href: string;
  id: string;
  type: "user";
  uri: string;
  display_name: string | null;
}

export interface SimplifiedPlaylist {
  collaborative: boolean;
  description: string;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  owner: PlaylistOwner;
  public: boolean;
  snapshot_id: string;
  tracks: {
    href: string;
    total: number;
  };
  type: "playlist";
  uri: string;
}

interface Restrictions {
  reason: string;
}

export interface Track {
  album: Album;
  artists: SimplifiedArtist[];
  disc_number: Array<string>;
  duration_ms: number;
  explicit: boolean;
  href: string;
  id: string;
  is_playable: boolean;
  linked_from?: unknown;
  restrictions?: Restrictions;
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: "track";
  uri: string;
  is_local: boolean;
}

export interface Artist {
  external_urls: ExternalUrls;
  followers: {
    href: string;
    total: number;
  };
  genres: Array<string>;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  popularity: number;
  type: "artist";
  uri: string;
}

export interface PlaylistItemTrack extends Track {
  album: Album;
  artists: SimplifiedArtist[];
}

export interface PlaylistItem {
  added_at: string;
  added_by: {
    external_urls: ExternalUrls;
    href: string;
    id: string;
    type: "user";
    uri: string;
  };
  is_local: boolean;
  track: PlaylistItemTrack;
}

export interface TopTracksResponse {
  href: string;
  limit: number;
  next: string;
  offset: string;
  previous: string | null;
  total: number;
  items: Track[];
}

export interface TopArtistsResponse {
  href: string;
  limit: number;
  next: string;
  offset: string;
  previous: string | null;
  total: number;
  items: Artist[];
}

export interface RecentlyPlayedResponse {
  href: string;
  limit: number;
  next: string;
  offset: string;
  previous: string | null;
  total: number;
  items: {
    track: Track;
    played_at: string;
    context: {
      type: "artist" | "playlist" | "album" | "show";
      href: string;
      external_urls: ExternalUrls;
      uri: string;
    };
  }[];
}

export interface UserPlaylistsResponse {
  href: string;
  limit: number;
  next: string;
  offset: string;
  previous: string | null;
  total: number;
  items: SimplifiedPlaylist[];
}

export interface PlaylistTracksResponse {
  href: string;
  limit: number;
  next: string;
  offset: string;
  previous: string | null;
  total: number;
  items: PlaylistItem[];
}

export interface AlbumStats extends Album {
  occurrences: number;
}

export const TIME_RANGES = ["short_term", "medium_term", "long_term"] as const;
export type TIME_RANGE = (typeof TIME_RANGES)[number];

export interface StatsResponse {
  tracks: Track[];
  artists: Artist[];
  albums: AlbumStats[];
  genres: string[];
}

export interface ArtistAlbumsResponse {
  href: string;
  limit: number;
  next: string;
  offset: number;
  previous: string;
  total: number;
  items: Album[];
}

export interface ArtistTopTracksResponse {
  tracks: Track[];
}

interface Pagination<T> {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: T[];
}

// Complete search response type
export interface SearchContentResponse {
  tracks?: Pagination<Track>;
  artists?: Pagination<SimplifiedArtist>;
  albums?: Pagination<Album>;
  // * Currently unused

  // playlists?: Pagination<PlaylistItem>;
  // shows?: Pagination<Show>;
  // episodes?: Pagination<Episode>;
  // audiobooks?: Pagination<Audiobook>;
}

export interface SearchContentParams {
  query: string;
  limit?: number;
  offset?: number;
  type?: Array<"artist" | "track" | "album">;
  // * Currently unused
  // | "playlist"
  // | "episode"
  // | "playbook"
  // | "artist";
  market?: string;
  include_external?: "audio";
}

type EnsureProperties<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Type function that makes certain properties required based on the search types
export type TypedSearchResponse<T extends (keyof SearchContentResponse)[]> =
  T extends Array<infer U>
    ? U extends keyof SearchContentResponse
      ? EnsureProperties<SearchContentResponse, U>
      : SearchContentResponse
    : SearchContentResponse;

export type SearchResult<T extends SearchContentParams["type"]> =
  T extends Array<infer U extends keyof SearchContentResponse>
    ? TypedSearchResponse<U[]>
    : SearchContentResponse;
