export enum COOKIE_VALUES {
  SHOW_GENRE_WARNING = "show_genre_warning",
}

export type DbTrackType = {
  id: string;
  name: string;
  trackNumber: number;
  durationMs: number;
  explicit: boolean;
  popularity: number;
  artists: {
    id: string;
    name: string;
  }[];
};

export type APIRecentlyPlayedFormat = {
  played_at: string;
  name: string;
  album_name: string;
  cover_image: string;
  album_id: string;
  track_id: string;
  popularity: number;
  artists: {
    artistId: string;
    name: string;
  }[];
};

export type UserUsage = {
  apiKeys: [
    {
      keyHash: string;
      usage: {
        daily: { [k: string]: number };
        total: { [k: string]: number };
        metadata: {
          lastEndpoint: string;
          lastMethod: string;
          lastAccess: number;
        };
      };
      metrics: {
        total_requests: number;
      };
    },
  ];
  daily: { [k: string]: number };
  total: {
    [k: string]: number;
  };
  monthly: {
    total: number;
  };
  metadata: {
    lastEndpoint: string;
    lastMethod: string;
    lastAccess: number;
  };
  limits: {
    monthly: number;
    remaining: number;
  };
};
