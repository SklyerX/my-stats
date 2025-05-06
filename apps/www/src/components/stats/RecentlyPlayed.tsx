import type { serverClient } from "@/server/trpc/server-client";
import groupBy from "lodash.groupby";
import { Dot } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";

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
              <Link
                href={`/track/${track.id}`}
                key={`${track.id}-${i}`}
                className="group flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <Image
                  src={
                    (track.album.images[0]?.url as string) || "/placeholder.svg"
                  }
                  alt={`${track.name}'s Album Cover`}
                  width={50}
                  height={50}
                  loading="lazy"
                  className="shrink-0 rounded-sm"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-base sm:text-lg truncate">
                      {track.name}
                    </h3>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNowStrict(track.playedAt, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground font-medium">
                    <p className="truncate">
                      {track.artists.map((artist) => artist.name).join(", ")}
                    </p>
                    <Dot className="size-3 shrink-0" />
                    <p className="truncate">{track.album.name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
