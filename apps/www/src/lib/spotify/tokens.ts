import "server-only";
import { db } from "@workspace/database/connection";
import { tokens as tokensTable } from "@workspace/database/schema";
import { decrypt, encrypt } from "../encryption";
import { eq } from "@workspace/database/drizzle";
import { env } from "@/env";

const REFRESH_THRESHOLD_MINUTES = 15;
const EXPIRATION_BUFFER_SECONDS = 300;

// TODO: figure out edge case. Why does it 99% of the time reset properly but sometimes it gets the expiration wrong?

interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function updateSpotifyTokens(
  userId: string,
  tokens: SpotifyTokens,
) {
  const encryptedAccess = encrypt(tokens.access_token);

  const now = Date.now();
  // Subtract buffer from expires_in to account for network latency
  const expires = new Date(
    now + (tokens.expires_in - EXPIRATION_BUFFER_SECONDS) * 1000,
  );

  // Debug logging
  console.log({
    setTokenAt: new Date(now).toISOString(),
    expiresAt: expires.toISOString(),
    expiresInSeconds: tokens.expires_in,
    effectiveExpiresIn: tokens.expires_in - EXPIRATION_BUFFER_SECONDS,
    minutesUntilExpiry: (expires.getTime() - now) / (1000 * 60),
  });

  await db
    .update(tokensTable)
    .set({
      accessToken: encryptedAccess.encryptedData,
      accessTokenIv: encryptedAccess.iv,
      accessTokenTag: encryptedAccess.tag,
      expiresAt: expires,
      lastRefreshed: new Date(now),
    })
    .where(eq(tokensTable.userId, userId));
}

export async function getValidSpotifyToken(userId: string): Promise<string> {
  try {
    const user = await db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.id, userId),
      with: {
        tokens: true,
      },
    });

    if (!user?.tokens) {
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

    const now = Date.now();
    const timeUntilExpiry = tokens.expiresAt.getTime() - now;
    const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);

    // Debug logging
    console.log({
      currentTime: new Date(now).toISOString(),
      tokenExpiresAt: tokens.expiresAt.toISOString(),
      minutesUntilExpiry,
      timeUntilExpiryMs: timeUntilExpiry,
      shouldRefresh: minutesUntilExpiry <= REFRESH_THRESHOLD_MINUTES,
    });

    if (minutesUntilExpiry <= REFRESH_THRESHOLD_MINUTES) {
      console.log(
        `Token expires soon, refreshing with ${minutesUntilExpiry.toFixed(2)} minutes remaining`,
      );

      const newTokens = await refreshSpotifyToken(refreshToken);
      await updateSpotifyTokens(userId, newTokens);
      return newTokens.access_token;
    }

    console.log(
      `Using existing token with ${minutesUntilExpiry.toFixed(2)} minutes remaining`,
    );
    return accessToken;
  } catch (err) {
    console.error("Error getting valid Spotify token:", err);

    try {
      const user = await db.query.users.findFirst({
        where: (fields, { eq }) => eq(fields.id, userId),
        with: {
          tokens: true,
        },
      });

      if (!user?.tokens) {
        throw new Error("Invalid user Spotify credentials");
      }

      const refreshToken = decrypt(
        user.tokens.refreshToken,
        user.tokens.refreshTokenIv,
        user.tokens.refreshTokenTag,
      );

      console.log("Forcing token refresh after error");

      const newTokens = await refreshSpotifyToken(refreshToken);
      await updateSpotifyTokens(userId, newTokens);

      return newTokens.access_token;
    } catch (refreshError) {
      console.error("Failed forced refresh attempt:", refreshError);

      throw new Error(
        "Could not get valid Spotify token after multiple attempts",
      );
    }
  }
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

  const data = await response.json();

  if (!data.refresh_token) {
    data.refresh_token = refresh_token;
  }

  return data;
}
