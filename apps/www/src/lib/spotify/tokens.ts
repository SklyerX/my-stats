import "server-only";

import { db } from "@workspace/database/connection";
import { tokens as tokensTable } from "@workspace/database/schema";
import { decrypt, encrypt } from "../encryption";
import { eq } from "@workspace/database/drizzle";
import { env } from "@/env";

interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function updateSpotifyTokens(
  userId: string,
  tokens: SpotifyTokens,
) {
  console.log("in the update function", tokens);

  const encryptedAccess = encrypt(tokens.access_token);

  const now = Date.now();
  const expires = new Date(now + tokens.expires_in * 1000);

  console.log({
    setTokenAt: new Date(now).toISOString(),
    expiresAt: expires.toISOString(),
    expiresInSeconds: tokens.expires_in,
    minutesUntilExpiry: (expires.getTime() - now) / (1000 * 60),
  });

  await db
    .update(tokensTable)
    .set({
      accessToken: encryptedAccess.encryptedData,
      accessTokenIv: encryptedAccess.iv,
      accessTokenTag: encryptedAccess.tag,
      expiresAt: expires,
    })
    .where(eq(tokensTable.userId, userId));
}

export async function getValidSpotifyToken(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: (fields, { eq }) => eq(fields.id, userId),
    with: {
      tokens: true,
    },
  });

  if (!user) {
    throw new Error("Invalid user Spotify credentials");
  }

  const { tokens } = user;

  const accessToken = decrypt(
    tokens.accessToken,
    tokens.accessTokenIv,
    tokens.accessTokenTag,
  );
  const refreshToken = decrypt(
    tokens.refreshToken,
    tokens.refreshTokenIv,
    tokens.refreshTokenTag,
  );

  console.log("in the validate function", accessToken);

  const now = Date.now();
  console.log({
    currentTime: new Date(now).toISOString(),
    tokenExpiresAt: tokens.expiresAt.toISOString(),
    minutesUntilExpiry: (tokens.expiresAt.getTime() - now) / (1000 * 60),
    isExpired: tokens.expiresAt.getTime() < now,
  });

  if (tokens.expiresAt.getTime() < Date.now()) {
    console.log("token expired, reloading");
    const tokens = await refreshSpotifyToken(refreshToken);
    await updateSpotifyTokens(userId, tokens);
    return tokens.access_token;
  }

  console.log("token is not expired");

  return accessToken;
}

async function refreshSpotifyToken(
  refresh_token: string,
): Promise<SpotifyTokens> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return response.json();
}
