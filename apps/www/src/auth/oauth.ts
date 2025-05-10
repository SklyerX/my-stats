import "server-only";

import { Spotify } from "arctic";
import { env } from "../env";
import { getUrl } from "@/lib/utils";

export const spotify = new Spotify(
  env.SPOTIFY_CLIENT_ID,
  env.SPOTIFY_CLIENT_SECRET,
  `${getUrl()}/api/auth/spotify/callback`,
);
