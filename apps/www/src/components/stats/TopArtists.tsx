import type { serverClient } from "@/server/trpc/server-client";
import type { TIME_RANGE } from "@/types/spotify";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AnimatedArtist } from "../wrappers/animated";
import { Header } from "./Header";
import type { JSX } from "react/jsx-runtime";

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
}: TopArtistsProps): JSX.Element {
  return (
    <div>
      <Header
        title="Top Artists"
        displayName={displayName}
        timeRange={timeRange}
        expanded={expanded}
        updateExpanded={updateExpanded}
      />
      <div className="mt-4 w-full overflow-x-scroll">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
          {isLoading
            ? [...Array(7)].map((_, i) => (
                <div className="flex flex-col items-center gap-3" key={i}>
                  <Skeleton className="w-32 h-32 rounded-full" />
                  <Skeleton className="w-16 h-5" />
                </div>
              ))
            : artists
                .slice(0, expanded ? undefined : 7)
                .map((artist, i) => (
                  <AnimatedArtist key={artist.id} artist={artist} index={i} />
                ))}
        </div>
      </div>
    </div>
  );
}
