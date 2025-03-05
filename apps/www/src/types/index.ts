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
