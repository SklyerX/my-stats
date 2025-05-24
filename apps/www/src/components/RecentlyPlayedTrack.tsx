import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import type { RecentlyPlayed } from "@/server/trpc/routers/user/types";
import { Dot } from "lucide-react";

interface Props {
  track: RecentlyPlayed;
}

export default function RecentlyPlayedTrack({ track }: Props) {
  return (
    <Link
      href={`/track/${track.id}`}
      className="group flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
    >
      <Image
        src={(track.album.images[0]?.url as string) || "/placeholder.svg"}
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
          {/* @ts-ignore */}
          <Dot className="size-3 shrink-0" />
          <p className="truncate">{track.album.name}</p>
        </div>
      </div>
    </Link>
  );
}
