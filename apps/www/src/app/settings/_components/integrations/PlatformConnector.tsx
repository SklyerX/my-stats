"use client";

import type { Integrations } from "@workspace/database/schema";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";

import { PiPlugsConnectedLight } from "react-icons/pi";

import { VscDebugDisconnect } from "react-icons/vsc";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@workspace/ui/components/sonner";
import { toggleIntegrationAction } from "../../_actions/toggle-integration";
import { disconnectPlatformAction } from "../../_actions/disconnect-platform";

interface Props {
  integrations: Integrations[];
}

export default function PlatformConnector({ integrations }: Props) {
  const [enabledIntegrations, setEnabledIntegrations] = useState<
    Record<string, boolean>
  >(() => {
    return integrations.reduce<Record<string, boolean>>((acc, integration) => {
      acc[integration.platformName.toLowerCase()] =
        integration.enabled ?? false;
      return acc;
    }, {});
  });

  const integrationsMap = integrations.reduce<
    Record<string, (typeof integrations)[0]>
  >((acc, integration) => {
    acc[integration.platformName.toLowerCase()] = integration;
    return acc;
  }, {});

  const toggleSocial = (platform: string, checked: boolean) => {
    const connected = integrationsMap[platform.toLowerCase()];

    if (!connected) return;

    const currentEnabled = enabledIntegrations[platform.toLowerCase()];

    setEnabledIntegrations((prev) => ({
      ...prev,
      [platform.toLowerCase()]: !currentEnabled,
    }));

    toast.promise(toggleIntegrationAction(platform, checked), {
      loading: "Updating...",
      success: "Preference updated.",
      error: (err) => {
        if (err instanceof Error) return err.message;
        return "Something went wrong while updating preference";
      },
    });
  };

  const handleDisconnect = (platform: string) => {
    toast.promise(disconnectPlatformAction(platform), {
      loading: "Disconnecting...",
      success: () => {
        setEnabledIntegrations((prev) => {
          const updated = { ...prev };
          delete updated[platform.toLowerCase()];
          return updated;
        });

        return "Disconnected!";
      },
      error: (err) => {
        if (err instanceof Error) return err.message;
        return "Something went wrong while disconnecting from this platform";
      },
    });
  };

  return (
    <div className="flex flex-row flex-wrap items-center gap-5">
      {platforms.map((platform) => {
        const connected = integrationsMap[platform.name.toLowerCase()];
        const enabled =
          enabledIntegrations[platform.name.toLowerCase()] || false;

        return (
          <Card key={platform.name} className="flex flex-col w-80 flex-grow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="rounded-md overflow-hidden">
                    <Image
                      src={platform.image}
                      alt={`${platform.name} logo`}
                      width={30}
                      height={30}
                      className="object-cover"
                    />
                  </div>
                  <CardTitle className="text-xl">{platform.name}</CardTitle>
                </div>
                {connected && (
                  <Badge
                    variant="outline"
                    className="text-green-500 border-none"
                  >
                    Connected
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-5">
                {platform.description}
              </CardDescription>
            </CardHeader>
            <div className="flex items-center justify-between border-t py-3 px-4">
              {!connected && !platform.disabled ? (
                <Link
                  href={`/api/connections/${platform.name.toLowerCase()}`}
                  className={buttonVariants({
                    size: "sm",
                    variant: "ghost",
                    class: "flex items-center gap-2",
                  })}
                >
                  <VscDebugDisconnect className="size-4" />
                  Connect
                </Link>
              ) : (
                <Button
                  disabled={platform.disabled}
                  onClick={() =>
                    !platform.disabled && handleDisconnect(platform.name)
                  }
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <PiPlugsConnectedLight className="size-4" />
                  Disconnect
                </Button>
              )}
              <Switch
                checked={enabled}
                disabled={!connected && !platform.disabled}
                onCheckedChange={(checked) =>
                  toggleSocial(platform.name, checked)
                }
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

const platforms = [
  {
    image: "/platforms/spotify.png",
    name: "Spotify",
    description: "Display your connected Spotify account on your profile page.",
    disabled: true,
  },
  {
    image: "/platforms/discord.png",
    name: "Discord",
    description: "Display your connected Discord account on your profile page.",
  },
  {
    image: "/platforms/github.png",
    name: "Github",
    description: "Display your connected Github account on your profile page.",
  },
  {
    image: "/platforms/twitch.png",
    name: "Twitch",
    description: "Display your connected Twitch account on your profile page.",
  },
];
