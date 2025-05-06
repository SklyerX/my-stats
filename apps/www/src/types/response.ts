import type { StatsResponse } from "./spotify";

export interface InternalTopUserStats {
  user: {
    image: string;
    name: string;
    bio: string;
    id: string;
    flags: number;
  };
  stats: StatsResponse;
}
