"use client";

import { toast } from "@workspace/ui/components/sonner";
import { Switch } from "@workspace/ui/components/switch";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { toggleSyncingAction } from "../../_actions/toggle-syncing";

interface Props {
  syncEnabled: boolean;
}

export default function SyncSpotifyStreams({ syncEnabled }: Props) {
  const [enabled, setEnabled] = useState<boolean>(syncEnabled);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleUpdate = (val: boolean) => {
    setIsLoading(true);
    setEnabled(val);

    toast.promise(toggleSyncingAction(val), {
      loading: "Updating...",
      success: "Updated!",
      error: (err) => {
        if (err instanceof Error) return err.message;
        return "Something went wrong while updating preference";
      },
      finally: () => setIsLoading(false),
    });
  };

  return (
    <div className="my-5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/platforms/spotify.png"
              alt="Spotify platform logo"
              width={30}
              height={30}
            />
            <h3 className="text-xl font-semibold">Sync Spotify Streams</h3>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleUpdate}
            disabled={isLoading}
          />
        </div>
        <p className="text-muted-foreground">
          Sync your spotify streams with your imported listening history. If you
          have not imported your listening yet, the system will account for
          overlaps.{" "}
          <Link className="text-primary" href="/docs/syncing">
            Learn more
          </Link>{" "}
          about syncing
        </p>
      </div>
    </div>
  );
}
