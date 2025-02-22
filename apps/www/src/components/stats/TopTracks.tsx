import type { serverClient } from "@/server/trpc/server-client";
import type { TIME_RANGE } from "@/types/spotify";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AnimatedTrack } from "../wrappers/animated";
import { Header } from "./Header";

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
      <Header
        title="Top Tracks"
        displayName={displayName}
        timeRange={timeRange}
        expanded={expanded}
        updateExpanded={updateExpanded}
      />
      <div className="mt-4 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {isLoading
            ? [...Array(6)].map((_, i) => (
                <div className="flex flex-col gap-3" key={i}>
                  <Skeleton className="w-32 h-32" />
                  <Skeleton className="w-16 h-4 rounded-sm" />
                </div>
              ))
            : tracks
                .slice(0, expanded ? undefined : 6)
                .map((track, i) => (
                  <AnimatedTrack key={track.id} track={track} index={i} />
                ))}
        </div>
      </div>
    </div>
  );
}
