import { getCurrentSession } from "@/auth/session";
import { env } from "@/env";
import { getUrl } from "@/lib/utils";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{
    platform: string;
  }>;
}

export async function GET(req: Request, { params }: Props) {
  const { platform } = await params;

  const { session } = await getCurrentSession();

  if (!session) return new Response("Unauthorized", { status: 401 });

  switch (platform) {
    case "discord":
      {
        const url = new URL("https://discord.com/oauth2/authorize");
        url.searchParams.append("response_type", "code");
        url.searchParams.append("client_id", env.DISCORD_CLIENT_ID);
        url.searchParams.append("scope", "identify");
        url.searchParams.append(
          "redirect_uri",
          `${getUrl()}/api/connections/discord/callback`,
        );

        redirect(url.toString());
      }
      break;
    case "github":
      {
        const url = new URL("https://github.com/login/oauth/authorize");
        url.searchParams.append("client_id", env.GITHUB_CLIENT_ID);
        url.searchParams.append(
          "redirect_uri",
          `${getUrl()}/api/connections/github/callback`,
        );
        redirect(url.toString());
      }
      break;
    case "twitch":
      {
        const url = new URL("https://id.twitch.tv/oauth2/authorize");
        url.searchParams.append("client_id", env.TWITCH_CLIENT_ID);
        url.searchParams.append("scope", "user:read:email");
        url.searchParams.append("response_type", "code");
        url.searchParams.append(
          "redirect_uri",
          `${getUrl()}/api/connections/twitch/callback`,
        );
        redirect(url.toString());
      }
      break;
    case "steam":
      {
        const url = new URL(
          "https://steamcommunity.com/oauth/login?response_type=token",
        );
        url.searchParams.append("client_id", env.STEAM_WEB_API_KEY);
        url.searchParams.append("scope", "user:read:email");
        url.searchParams.append(
          "redirect_uri",
          `${getUrl()}/api/connections/twitch/callback`,
        );
        redirect(url.toString());
      }
      break;
  }
}
