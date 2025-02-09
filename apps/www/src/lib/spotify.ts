import "server-only";

import { db } from "@workspace/database/connection";
import { tokens as tokensTable } from "@workspace/database/schema";
import { decrypt, encrypt } from "./encryption";
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
  const expires = new Date(Date.now() + tokens.expires_in * 1000);

  const encryptedAccess = encrypt(tokens.access_token);
  const encryptedRefresh = encrypt(tokens.refresh_token);

  await db
    .update(tokensTable)
    .set({
      accessToken: encryptedAccess.encryptedData,
      accessTokenIv: encryptedAccess.iv,
      accessTokenTag: encryptedAccess.tag,
      refreshToken: encryptedRefresh.encryptedData,
      refreshTokenIv: encryptedRefresh.iv,
      refreshTokenTag: encryptedRefresh.tag,
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

  if (tokens.expiresAt.getTime() < Date.now()) {
    const tokens = await refreshSpotifyToken(refreshToken);
    await updateSpotifyTokens(userId, tokens);
    return tokens.access_token;
  }

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
