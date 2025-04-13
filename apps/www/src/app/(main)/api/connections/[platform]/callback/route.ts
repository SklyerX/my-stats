import { getCurrentSession } from "@/auth/session";
import { env } from "@/env";
import { db } from "@workspace/database/connection";
import type { db as DBType } from "@workspace/database/connection";
import { integrations, type User } from "@workspace/database/schema";
import { getURL } from "next/dist/shared/lib/utils";
import { NextResponse } from "next/server";

interface Props {
  params: Promise<{
    platform: string;
  }>;
}

interface OAuthConfig {
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  getUserData: (data: any) => {
    id: string;
    username: string;
    avatarUrl: string | null;
    profileUrl: string;
  };
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  discord: {
    tokenUrl: "https://discord.com/api/v10/oauth2/token",
    userInfoUrl: "https://discord.com/api/v10/users/@me",
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    redirectUri: `${getURL()}/api/connections/discord/callback`,
    getUserData: (userData) => ({
      id: userData.id,
      username: userData.username,
      profileUrl: `https://discord.com/users/${userData.id}`,
      avatarUrl: userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp?size=240`
        : null,
    }),
  },
  github: {
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    redirectUri: `${getURL()}/api/connections/github/callback`,
    getUserData: (userData) => ({
      id: userData.id,
      username: userData.login,
      profileUrl: `https://github.com/${userData.login}`,
      avatarUrl: userData.avatar_url,
    }),
  },
  twitch: {
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    userInfoUrl: "https://api.twitch.tv/helix/users",
    clientId: env.TWITCH_CLIENT_ID,
    clientSecret: env.TWITCH_CLIENT_SECRET,
    redirectUri: `${getURL()}/api/connections/twitch/callback`,
    getUserData: (userData) => {
      const user = userData.data[0];
      return {
        id: user.id,
        username: user.login,
        profileUrl: `https://twitch.tv/${user.login}`,
        avatarUrl: user.profile_image_url,
      };
    },
  },
};

export async function GET(req: Request, { params }: Props) {
  const { platform } = await params;
  const { session, user } = await getCurrentSession();

  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!OAUTH_CONFIGS[platform]) {
    return NextResponse.json(`Unsupported platform: ${platform}`, {
      status: 400,
    });
  }

  try {
    await handleOAuth(req, user, platform);

    return new Response(null, {
      status: 307,
      headers: {
        Location: "/settings/integrations?success=true",
      },
    });
  } catch (error) {
    console.error(`Error handling ${platform} OAuth:`, error);
    if (error instanceof Error)
      return NextResponse.json(
        `Failed to connect ${platform} account: ${error.message}`,
        {
          status: 500,
        },
      );

    return NextResponse.json(`Failed to connect ${platform} account`, {
      status: 500,
    });
  }
}

async function handleOAuth(req: Request, user: User, platform: string) {
  const config = OAUTH_CONFIGS[platform];
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    throw new Error("No authorization code provided");
  }

  const accessToken = await exchangeCodeForToken(code, config, platform);

  const userData = await fetchUserData(accessToken, config, platform);

  await saveIntegration(user, platform, userData);
}

async function exchangeCodeForToken(
  code: string,
  config: OAuthConfig,
  platform: string,
): Promise<string> {
  const formData = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    redirect_uri: config.redirectUri,
    ...(platform === "twitch" || platform === "discord"
      ? { grant_type: "authorization_code" }
      : {}),
  });

  const request = new Request(config.tokenUrl, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(platform === "github" ? { Accept: "application/json" } : {}),
    },
  });

  const response = await fetch(request);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchUserData(
  accessToken: string,
  config: OAuthConfig,
  platform: string,
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  if (platform === "github") {
    headers.Accept = "application/json";
  }

  if (platform === "twitch") {
    headers["Client-Id"] = env.TWITCH_CLIENT_ID;
  }

  const response = await fetch(config.userInfoUrl, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch user data: ${errorText}`);
  }

  const userData = await response.json();

  if (platform === "twitch" && (!userData.data || !userData.data[0])) {
    throw new Error("No user data found in Twitch response");
  }

  return userData;
}

async function saveIntegration(user: User, platform: string, rawUserData: any) {
  const config = OAUTH_CONFIGS[platform];
  if (!config) {
    throw new Error(`Invalid platform: ${platform}`);
  }
  const userData = config.getUserData(rawUserData);

  await db.insert(integrations).values({
    platformName: platform,
    platformUserId: userData.id,
    platformUsername: userData.username,
    userId: user.id,
    enabled: true,
    profileUrl: userData.profileUrl,
    avatarUrl: userData.avatarUrl,
  });
}
