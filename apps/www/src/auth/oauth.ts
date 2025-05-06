import "server-only";

import { Spotify } from "arctic";
import { env } from "../env";

export const spotify = new Spotify(
  env.SPOTIFY_CLIENT_ID,
  env.SPOTIFY_CLIENT_SECRET,
  "http://stats.skylerx.ir:3000/api/auth/spotify/callback",
);
