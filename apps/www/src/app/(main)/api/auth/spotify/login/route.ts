import { generateState } from "arctic";
import { spotify } from "@/auth/oauth";
import { cookies } from "next/headers";

const SCOPES = [
  "user-read-email",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-top-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "playlist-modify-public",
  "playlist-modify-private",
];

export async function GET(): Promise<Response> {
  const state = generateState();
  const url = spotify.createAuthorizationURL(state, null, SCOPES);

  const cookieStore = await cookies();

  cookieStore.set("spotify_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  console.log(url);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
    },
  });
}
