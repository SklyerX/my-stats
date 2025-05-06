import type { TIME_RANGE } from "@/types/spotify";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { serverClient } from "@/server/trpc/server-client";
import { AnimatedAlbum } from "../wrappers/animated";
import { Header } from "./Header";

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
      <Header
        title="Top Albums"
        displayName={displayName}
        timeRange={timeRange}
        expanded={expanded}
        updateExpanded={updateExpanded}
      />
      <div className="mt-4 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
          {isLoading
            ? [...Array(7)].map((_, i) => (
                <div className="flex flex-col gap-3" key={i}>
                  <Skeleton className="w-32 h-32" />
                  <Skeleton className="w-16 h-4 rounded-sm" />
                </div>
              ))
            : albums
                .slice(0, expanded ? undefined : 7)
                .map((album, i) => (
                  <AnimatedAlbum key={album.id} album={album} index={i} />
                ))}
        </div>
      </div>
    </div>
  );
}
