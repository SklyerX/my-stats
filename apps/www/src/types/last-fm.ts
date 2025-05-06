export interface Artist {
  name: string;
  mbid?: string; // Not all artists have mbid
  match?: string; // Match score (used in similar artists)
  url: string;
  image?: Array<{
    "#text": string;
    size: string;
  }>;
  streamable?: string;
}

export interface SimilarArtistsResponse {
  similarartists: {
    artist: Artist[];
    "@attr": {
      artist: string;
    };
  };
}

export interface LastFmCacheEntry {
  name: string;
  mbid?: string;
  similarArtists: {
    name: string;
    mbid?: string;
    url: string;
    match: string;
  }[];
  timestamp: number;
}

export interface SearchArtistResponse {
  results: {
    artistmatches: {
      artist: Artist[];
    };
    "@attr": {
      for: string;
    };
  };
}
