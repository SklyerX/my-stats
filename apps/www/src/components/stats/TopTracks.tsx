import { TIME_RANGE_TEXT } from "@/lib/constants";
import type { serverClient } from "@/server/trpc/server-client";
import type { TIME_RANGE } from "@/types/spotify";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { motion } from "framer-motion";
import { Grid2X2, Grid2x2X } from "lucide-react";
import Link from "next/link";

interface TopTracksProps {
  tracks: Awaited<
    ReturnType<(typeof serverClient)["user"]["top"]>
  >["stats"]["tracks"];
  displayName: string;
  timeRange: TIME_RANGE;
  isLoading: boolean;
  expanded: boolean;
  updateExpanded: (expanded: boolean) => void;
}

export function TopTracks({
  tracks,
  displayName,
  timeRange,
  isLoading,
  expanded,
  updateExpanded,
}: TopTracksProps) {
  return (
    <div>
      <div className="bg-background sticky w-full z-50 top-0 left-0 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Top Tracks</h2>
          {!expanded ? (
            <Button
              variant="secondary"
              size="icon"
              onMouseDown={() => updateExpanded(true)}
            >
              <Grid2X2 className="size-5" />
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="icon"
              onMouseDown={() => updateExpanded(false)}
            >
              <Grid2x2X className="size-5" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-muted-foreground">
          {displayName}'s top tracks over the past{" "}
          {TIME_RANGE_TEXT[timeRange].toLowerCase()}
        </p>
      </div>
      <div className="mt-4 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {isLoading
            ? [...Array(6)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <div className="flex flex-col gap-3" key={i}>
                  <Skeleton className="w-32 h-32" />
                  <Skeleton className="w-16 h-4 rounded-sm" />
                </div>
              ))
            : tracks.slice(0, expanded ? undefined : 6).map((track, i) => (
                <Link href={`/track/${track.id}`} key={track.id}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="aspect-square"
                  >
                    <div className="relative">
                      {i === 0 ? (
                        <span className="absolute text-3xl z-40 -rotate-45 -left-5 -top-5">
                          👑
                        </span>
                      ) : null}
                      <img
                        src={track.album.images[0]?.url as string}
                        alt={`${track.name} Track Cover`}
                        className="rounded-md w-full h-full object-cover"
                      />
                    </div>
                    <p className="mt-2 text-lg font-semibold line-clamp-2">
                      <span
                        className={cn("text-xl", {
                          "text-yellow-300": i === 0,
                        })}
                      >
                        {i + 1}.
                      </span>{" "}
                      {track.name}
                    </p>
                    <li className="mt-1 line-clamp-2">
                      {track.artists.map((artist, i) => (
                        <div className="text-muted-foreground" key={artist.id}>
                          <span className="hover:text-foreground transition-colors">
                            {artist.name}
                          </span>
                          {i !== track.artists.length - 1 ? "," : null}
                        </div>
                      ))}
                    </li>
                  </motion.div>
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}
