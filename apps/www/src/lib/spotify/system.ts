import "server-only";
import { redis } from "../redis";
import { CACHE_KEYS } from "../constants";
import { env } from "@/env";

export async function getSystemAccessToken() {
  const cachedKey = CACHE_KEYS.systemSpotifyToken();
  const cachedToken = await redis.get(cachedKey);

  if (cachedToken) return cachedToken;

  const request = new Request("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: "grant_type=client_credentials",
  });

  const credentialsBuffer = Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  request.headers.set("Content-Type", "application/x-www-form-urlencoded");
  request.headers.set("Authorization", `Basic ${credentialsBuffer}`);

  const response = await fetch(request);

  const data = await response.json();

  await redis.set(cachedKey, data.access_token, {
    ex: 3500,
  });

  return data.access_token;
}
