import type { StatsResponse } from "./spotify";

export interface InternalTopUserStats {
  user: {
    image: string;
    name: string;
    bio: string;
  };
  stats: StatsResponse;
}
