"use client";

import { trpc } from "@/server/trpc/client";
import { type TIME_RANGE, TIME_RANGES } from "@/types/spotify";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import type { serverClient } from "@/server/trpc/server-client";
import { TopGenres } from "@/components/stats/TopGenres";
import { TopAlbums } from "@/components/stats/TopAlbums";
import { TopTracks } from "@/components/stats/TopTracks";
import { TopArtists } from "@/components/stats/TopArtists";
import { RecentlyPlayed } from "@/components/stats/RecentlyPlayed";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";

interface Props {
  initialStats: Awaited<
    ReturnType<(typeof serverClient)["user"]["top"]>
  >["stats"];
  recentlyPlayed: Awaited<
    ReturnType<(typeof serverClient)["user"]["recentlyPlayed"]>
  >;
  displayName: string;
}

export default function StatsContainer({
  initialStats,
  recentlyPlayed,
  displayName,
}: Props) {
  const [timeRange, setTimeRange] = useQueryState(
    "time_range",
    parseAsStringLiteral(TIME_RANGES).withDefault("short_term"),
  );
  const [stats, setStats] = useState(initialStats);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { slug } = useParams();

  const [expanded, setExpanded] = useState({
    artists: false,
    tracks: false,
    albums: false,
  });

  const updateExpanded = (key: keyof typeof expanded, value: boolean) =>
    setExpanded((prev) => ({ ...prev, [key]: value }));

  const { data, refetch } = trpc.user.top.useQuery(
    {
      slug: slug as string,
      time_range: timeRange,
    },
    {
      enabled: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const handleTimeRangeChange = async (value: TIME_RANGE) => {
    setIsLoading(true);
    await setTimeRange(value);
    await refetch();
    setIsLoading(false);
  };

  useEffect(() => {
    if (data?.stats) {
      console.log("we got data back");
      setStats(data.stats);
    }
  }, [data?.stats]);

  return (
    <div className="space-y-8 mt-10 p-5 w-full">
      <TimeRangeSelector
        isLoading={isLoading}
        onTimeRangeChange={handleTimeRangeChange}
        timeRange={timeRange}
      />

      <TopGenres
        genres={stats.genres}
        displayName={displayName}
        isLoading={isLoading}
        timeRange={timeRange}
      />

      <TopAlbums
        albums={stats.albums}
        displayName={displayName}
        expanded={expanded.albums}
        isLoading={isLoading}
        timeRange={timeRange}
        updateExpanded={(expanded) => updateExpanded("albums", expanded)}
      />

      <TopTracks
        tracks={stats.tracks}
        displayName={displayName}
        expanded={expanded.tracks}
        isLoading={isLoading}
        timeRange={timeRange}
        updateExpanded={(expanded) => updateExpanded("tracks", expanded)}
      />

      <TopArtists
        artists={stats.artists}
        displayName={displayName}
        expanded={expanded.artists}
        isLoading={isLoading}
        timeRange={timeRange}
        updateExpanded={(expanded) => updateExpanded("artists", expanded)}
      />

      <RecentlyPlayed
        displayName={displayName}
        recentlyPlayed={recentlyPlayed}
      />
    </div>
  );
}
