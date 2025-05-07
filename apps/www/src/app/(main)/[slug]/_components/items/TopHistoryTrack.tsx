import type { Track } from "@workspace/database/schema";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import Image from "next/image";
import React from "react";
import { Dot } from "lucide-react";
import type { JSX } from "react/jsx-runtime";

interface Props {
  track: Track;
  index: number;
}

export default function TopHistoryTrack({ track, index }: Props): JSX.Element {
  return (
    <Link
      href={`/track/${track.trackId}`}
      className="flex items-center gap-5"
      key={`history_${track.trackId}`}
    >
      <span
        className={cn("text-xl", {
          "text-yellow-300": index === 0,
          "text-muted-foreground": index !== 0,
        })}
      >
        #{index + 1}
      </span>
      <div className="group w-full flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
        <Image
          src={track.imageUrl || "/placeholder.svg"}
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
          </div>
          <div className="flex items-center text-sm text-muted-foreground font-medium">
            <p className="truncate">{track.artist}</p>
            <Dot className="size-3 shrink-0" />
            <p className="truncate">{track.album}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
