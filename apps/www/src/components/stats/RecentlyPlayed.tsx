import type { serverClient } from "@/server/trpc/server-client";
import groupBy from "lodash.groupby";
import { Dot } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import RecentlyPlayedTrack from "../RecentlyPlayedTrack";

interface RecentlyPlayedProps {
  recentlyPlayed: Awaited<
    ReturnType<(typeof serverClient)["user"]["recentlyPlayed"]>
  >;
  displayName: string;
}

export function RecentlyPlayed({
  recentlyPlayed,
  displayName,
}: RecentlyPlayedProps) {
  const groupedTracks = groupBy(recentlyPlayed, (track) => {
    const date = new Date(track.playedAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  });

  return (
    <div>
      <div className="sticky top-0 left-0 z-50 w-full bg-background py-2">
        <h2 className="text-2xl font-semibold">Recently Played</h2>
        <p className="mt-1 font-medium text-muted-foreground">
          {displayName}'s recently played tracks.
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedTracks).map(([date, tracks], i) => (
          <div className="space-y-2" key={date}>
            <h2 className="sticky top-16 left-0 z-40 mb-2 w-full bg-background py-2 text-lg font-medium text-muted-foreground">
              {date}
            </h2>
            {tracks.map((track, i) => (
              <RecentlyPlayedTrack track={track} key={`${track.id}-${i}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
