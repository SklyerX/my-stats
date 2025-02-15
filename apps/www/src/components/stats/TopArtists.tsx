import { TIME_RANGE_TEXT } from "@/lib/constants";
import type { serverClient } from "@/server/trpc/server-client";
import type { TIME_RANGE } from "@/types/spotify";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { motion } from "framer-motion";
import { Grid2X2, Grid2x2X } from "lucide-react";
import Link from "next/link";
import React from "react";

interface TopArtistsProps {
  artists: Awaited<
    ReturnType<(typeof serverClient)["user"]["top"]>
  >["stats"]["artists"];
  displayName: string;
  timeRange: TIME_RANGE;
  isLoading: boolean;
  expanded: boolean;
  updateExpanded: (expanded: boolean) => void;
}

export function TopArtists({
  artists,
  displayName,
  timeRange,
  isLoading,
  expanded,
  updateExpanded,
}: TopArtistsProps) {
  return (
    <div>
      <div className="bg-background sticky w-full z-50 top-0 left-0 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Top Artists</h2>
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
        <p className="mt-1 text-muted-foreground font-medium">
          {displayName}'s top artists over the past{" "}
          {TIME_RANGE_TEXT[timeRange].toLowerCase()}
        </p>
      </div>
      <div className="mt-4 w-full overflow-x-scroll">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
          {isLoading
            ? [...Array(7)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <div className="flex flex-col items-center gap-3" key={i}>
                  <Skeleton className="w-32 h-32 rounded-full" />
                  <Skeleton className="w-16 h-5" />
                </div>
              ))
            : artists.slice(0, expanded ? undefined : 7).map((artist, i) => (
                <Link href={`/artist/${artist.id}`} key={artist.id}>
                  <motion.div
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.05 + i * 0.1 }}
                    className="aspect-square"
                  >
                    <img
                      src={artist.images[0]?.url as string}
                      alt={`${artist.name}`}
                      className="rounded-full w-full h-full object-cover"
                    />
                    <div className="mt-2 font-semibold text-lg text-center">
                      <span
                        className={cn("text-xl", {
                          "text-yellow-300": i === 0,
                        })}
                      >
                        {i + 1}
                      </span>
                      . {artist.name}
                    </div>
                  </motion.div>
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}
