import {
  generateSessionToken,
  createSession,
  setSessionTokenCookie,
} from "@/auth/session";
import { spotify } from "@/auth/oauth";
import { cookies } from "next/headers";

import { db } from "@workspace/database/connection";
import {
  users,
  tokens as tokensTable,
  integrations,
} from "@workspace/database/schema";
import { ObjectParser } from "@pilcrowjs/object-parser";
import { encrypt } from "@/lib/encryption";
import { eq } from "@workspace/database/drizzle";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("spotify_oauth_state")?.value ?? null;

  if (code === null || state === null || storedState === null) {
    return new Response(null, {
      status: 400,
    });
  }

  if (state !== storedState) {
    return new Response(null, {
      status: 400,
    });
  }

  console.log("entering try/catch clause");

  try {
    const tokens = await spotify.validateAuthorizationCode(code, null);
    const accessToken = tokens.accessToken();
    const refreshToken = tokens.refreshToken();
    const accessTokenExpiresAt = tokens.accessTokenExpiresAt();

    console.log("access token retrieved", { accessTokenExpiresAt });

    const userRequest = new Request("https://api.spotify.com/v1/me", {
      method: "GET",
    });

    userRequest.headers.set("Authorization", `Bearer ${accessToken}`);
    userRequest.headers.set("Content-Type", "application/json");

    console.log("fetching user data");

    console.log(accessToken);

    const userResponse = await fetch(userRequest);
    console.log(userResponse, "user response");
    const userResult: unknown = await userResponse.json();
    const userParser = new ObjectParser(userResult);

    const spotifyUserId = userParser.getString("id");
    const spotifyUserName = userParser.getString("display_name");
    const spotifyUserEmail = userParser.getString("email");
    const spotifyUserImages = userParser.getArray("images") as Array<{
      url: string;
      width: number;
      height: number;
    }>;

    console.log("fetched user data", spotifyUserId, spotifyUserName);

    const existingUser = await db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.spotifyId, spotifyUserId),
    });

    console.log("does user exist?");

    console.log({
      spotifyTokenInfo: {
        rawExpiresAt: tokens.accessTokenExpiresAt(),
        currentTime: new Date(),
        timeUntilExpiry:
          (tokens.accessTokenExpiresAt().getTime() - Date.now()) / 1000,
      },
    });

    if (existingUser) {
      console.log("yes, sending user back");
      const sessionToken = generateSessionToken();
      const session = await createSession(sessionToken, existingUser.id);

      setSessionTokenCookie(sessionToken, session.expiresAt);

      await encryptAndStoreTokens({
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: accessTokenExpiresAt,
        userId: existingUser.id,
      });

      return new Response(null, {
        status: 302,
        headers: {
          Location: `/${existingUser.slug}`,
        },
      });
    }

    console.log("no, creating user");

    const spotifyImage =
      spotifyUserImages.length > 0
        ? spotifyUserImages.at(0)?.url
        : `https://api.dicebear.com/9.x/glass/svg?seed=${spotifyUserName}`;

    const [user] = await db
      .insert(users)
      .values({
        flags: 0,
        email: spotifyUserEmail,
        slug: spotifyUserName.toLowerCase(),
        spotifyId: spotifyUserId,
        username: spotifyUserName,
        image: spotifyImage,
      })
      .returning();

    if (!user) return new Response("Failed to create user");

    await db.insert(integrations).values({
      platformName: "spotify",
      userId: user.id,
      avatarUrl: spotifyImage,
      enabled: true,
      platformUsername: spotifyUserName,
      platformUserId: spotifyUserId,
      profileUrl: `https://open.spotify.com/user/${spotifyUserId}`,
    });

    console.log("user created");

    if (!user) return new Response("Failed to create user", { status: 500 });

    console.log("user check passed, creating session");

    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, user.id);

    console.log("setting session");

    setSessionTokenCookie(sessionToken, session.expiresAt);

    console.log("encrypting data and redirecting");

    await encryptAndStoreTokens({
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: accessTokenExpiresAt,
      userId: user.id,
      newUser: true,
    });

    console.log("finished");

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/${user.slug}`,
      },
    });
  } catch (err) {
    console.error("in auth callback", err);
    console.log(err);

    return new Response("check console for errors", {
      status: 500,
    });
    // if (err instanceof OAuth2RequestError) {
    // 	const code = err.code;

    // 	return new Response(code, {
    // 		status: 400,
    // 	});
    // }
    // if (err instanceof ArcticFetchError) {
    // 	const cause = err.cause;

    // 	return new Response(JSON.stringify(cause), {
    // 		status: 400,
    // 	});
    // }

    // return new Response(null, {
    // 	status: 302,
    // 	headers: {
    // 		Location: "/login",
    // 	},
    // });
  }
}
interface Props {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date; // You're passing in the OAuth date
  userId: string;
  newUser?: boolean;
}

async function encryptAndStoreTokens({
  accessToken,
  refreshToken,
  expiresAt,
  userId,
  newUser = true,
}: Props) {
  const now = new Date();
  console.log({
    tokenStorageInfo: {
      serverTime: now.toISOString(),
      receivedExpiresAt: expiresAt.toISOString(),
      timeUntilExpiry: (expiresAt.getTime() - now.getTime()) / 1000,
    },
  });

  const {
    encryptedData: encryptedAccessToken,
    iv: accessTokenIv,
    tag: accessTokenTag,
  } = encrypt(accessToken);
  const {
    encryptedData: encryptedRefreshToken,
    iv: refreshTokenIv,
    tag: refreshTokenTag,
  } = encrypt(refreshToken);

  const bufferedExpiresAt = new Date(expiresAt.getTime() - 5 * 60 * 1000);

  const dataObject = {
    accessToken: encryptedAccessToken,
    accessTokenIv,
    accessTokenTag,
    refreshToken: encryptedRefreshToken,
    refreshTokenIv: refreshTokenIv,
    refreshTokenTag: refreshTokenTag,
    expiresAt: bufferedExpiresAt,
  };

  if (!newUser) {
    await db
      .update(tokensTable)
      .set(dataObject)
      .where(eq(tokensTable.userId, userId));
  } else {
    await db.insert(tokensTable).values({ ...dataObject, userId });
  }
}
