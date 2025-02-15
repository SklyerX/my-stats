import { TIME_RANGE_TEXT } from "@/lib/constants";
import type { TIME_RANGE } from "@/types/spotify";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

interface TopGenresProps {
  genres: string[];
  displayName: string;
  timeRange: TIME_RANGE;
  isLoading: boolean;
}

export function TopGenres({
  genres,
  displayName,
  timeRange,
  isLoading,
}: TopGenresProps) {
  return (
    <div>
      <div className="bg-background sticky w-full z-50 top-0 left-0 py-2">
        <h2 className="text-2xl font-semibold">Top Genres</h2>
        <p className="mt-1 text-muted-foreground font-medium">
          {displayName}'s top genres over the past{" "}
          {TIME_RANGE_TEXT[timeRange].toLowerCase()}
        </p>
      </div>
      <div className="mt-4 w-full overflow-x-scroll">
        <div className="flex flex-nowrap min-w-min gap-5 pb-4">
          {isLoading
            ? [...Array(10)].map((_, i) => (
                <Skeleton
                  className={cn("rounded-sm", {
                    "w-24 h-5": i % 2 === 0,
                    "w-16 h-5": i % 2 !== 0,
                  })}
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  key={i}
                />
              ))
            : genres.map((genre, i) => (
                <Link href={`/genre/${encodeURIComponent(genre)}`} key={genre}>
                  <motion.div
                    initial={{
                      scale: 0,
                    }}
                    animate={{
                      scale: 1,
                    }}
                    transition={{
                      delay: i * 0.1,
                    }}
                    className="flex-shrink-0 whitespace-nowrap bg-primary/40 px-3 rounded-sm "
                  >
                    {genre}
                  </motion.div>
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}
