import type { Album, TIME_RANGE } from "@/types/spotify";
import { Button } from "@workspace/ui/components/button";
import { Grid2X2, Grid2x2X } from "lucide-react";
import { TIME_RANGE_TEXT } from "@/lib/constants";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Link from "next/link";
import { motion } from "framer-motion";
import type { serverClient } from "@/server/trpc/server-client";

interface TopAlbumsProps {
  albums: Awaited<
    ReturnType<(typeof serverClient)["user"]["top"]>
  >["stats"]["albums"];
  displayName: string;
  timeRange: TIME_RANGE;
  isLoading: boolean;
  expanded: boolean;
  updateExpanded: (expanded: boolean) => void;
}

export function TopAlbums({
  albums,
  displayName,
  timeRange,
  isLoading,
  expanded,
  updateExpanded,
}: TopAlbumsProps) {
  return (
    <div>
      <div className="bg-background sticky w-full z-50 top-0 left-0 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Top Albums</h2>
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
        <p className="mt-1 text-muted-foreground">
          {displayName}'s top albums over the past{" "}
          {TIME_RANGE_TEXT[timeRange].toLowerCase()}
        </p>
      </div>
      <div className="mt-4 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
          {isLoading
            ? [...Array(7)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <div className="flex flex-col gap-3" key={i}>
                  <Skeleton className="w-32 h-32" />
                  <Skeleton className="w-16 h-4 rounded-sm" />
                </div>
              ))
            : albums.slice(0, expanded ? undefined : 7).map((album, i) => (
                <Link href={`/album/${album.id}`} key={album.id}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="aspect-square"
                  >
                    <img
                      src={album.images[0]?.url as string}
                      alt={`${album.name} Cover`}
                      className="rounded-md w-full h-full object-cover"
                    />
                    <p className="mt-2 text-lg font-semibold line-clamp-2">
                      <span className="text-xl">{i + 1}.</span> {album.name}
                    </p>
                    <li className="mt-1 line-clamp-2">
                      {album.artists.map((artist, i) => (
                        <div className="text-muted-foreground" key={artist.id}>
                          <span className="hover:text-foreground transition-colors">
                            {artist.name}
                          </span>
                          {i !== album.artists.length - 1 ? "," : null}
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
