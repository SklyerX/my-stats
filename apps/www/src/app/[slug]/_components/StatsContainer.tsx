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
import type {
  User,
  UserListeningHistory,
  UserTopArtist,
  UserTopTrack,
} from "@workspace/database/schema";
import { convertTo12Hour } from "@/lib/utils";
import Playback from "@/components/Playback";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import { IoContrast } from "react-icons/io5";
import { buttonVariants } from "@workspace/ui/components/button";

interface Props {
  initialStats: Awaited<
    ReturnType<(typeof serverClient)["user"]["top"]>
  >["stats"];
  recentlyPlayed: Awaited<
    ReturnType<(typeof serverClient)["user"]["recentlyPlayed"]>
  >;
  user: Pick<
    Awaited<ReturnType<(typeof serverClient)["user"]["top"]>>["user"],
    "id" | "name"
  >;
  listeningHistory?: {
    history: UserListeningHistory | undefined;
    tracks?: UserTopTrack[] | null;
    artists?: UserTopArtist[] | null;
  } | null;
  authedUser?: User;
}

const f = new Intl.NumberFormat("en-US", {
  notation: "standard",
});

export default function StatsContainer({
  initialStats,
  recentlyPlayed,
  user,
  listeningHistory,
  authedUser,
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
      queryKey: ["user.top", { slug: slug as string, time_range: timeRange }],
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
      <Tabs defaultValue="stats">
        <div
          className={cn(
            "flex flex-col sm:flex-row justify-between relative z-10",
            {
              "justify-end": !listeningHistory?.history,
            },
          )}
        >
          {listeningHistory?.history && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <div className="flex flex-col">
                <p className="font-semibold text-xl">
                  {f.format(listeningHistory.history.totalTracks)}
                </p>
                <span className="text-muted-foreground font-medium text-xl">
                  Streams
                </span>
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-xl">
                  {f.format(listeningHistory.history.listeningHours)}
                </p>
                <span className="text-muted-foreground font-medium text-xl">
                  Hours Streamed
                </span>
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-xl">
                  {f.format(
                    Math.round(listeningHistory.history.listeningHours * 60),
                  )}
                </p>
                <span className="text-muted-foreground font-medium text-xl">
                  Minutes Streamed
                </span>
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-xl">
                  {f.format(listeningHistory.history.uniqueTracks)}
                </p>
                <span className="text-muted-foreground font-medium text-xl">
                  Unique Tracks
                </span>
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-xl">
                  {f.format(listeningHistory.history.uniqueArtists)}
                </p>
                <span className="text-muted-foreground font-medium text-xl">
                  Unique Artists
                </span>
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-xl">
                  {convertTo12Hour(listeningHistory.history.peakHour)}
                </p>
                <span className="text-muted-foreground font-medium text-xl">
                  Peak Hour
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center h-fit gap-5 my-10 sm:my-0">
            <TimeRangeSelector
              isLoading={isLoading}
              onTimeRangeChange={handleTimeRangeChange}
              timeRange={timeRange}
            />

            <TabsList className="bg-transparent">
              <TabsTrigger
                value="stats"
                className="data-[state=active]:bg-muted data-[state=active]:shadow-none"
              >
                Stats
              </TabsTrigger>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-block">
                      <TabsTrigger
                        value="history"
                        disabled={!listeningHistory?.history}
                        className="data-[state=active]:bg-muted data-[state=active]:shadow-none"
                      >
                        History
                      </TabsTrigger>
                    </div>
                  </TooltipTrigger>
                  {!listeningHistory?.history && (
                    <TooltipContent>
                      <p>This user has not imported their listening history</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </TabsList>
          </div>
        </div>

        <TabsContent value="stats" className="space-y-6">
          <Playback userId={user.id} />

          <TopGenres
            genres={stats.genres}
            displayName={user.name}
            isLoading={isLoading}
            timeRange={timeRange}
          />

          <TopAlbums
            albums={stats.albums}
            displayName={user.name}
            expanded={expanded.albums}
            isLoading={isLoading}
            timeRange={timeRange}
            updateExpanded={(expanded) => updateExpanded("albums", expanded)}
          />

          <TopTracks
            tracks={stats.tracks}
            displayName={user.name}
            expanded={expanded.tracks}
            isLoading={isLoading}
            timeRange={timeRange}
            updateExpanded={(expanded) => updateExpanded("tracks", expanded)}
          />

          <TopArtists
            artists={stats.artists}
            displayName={user.name}
            expanded={expanded.artists}
            isLoading={isLoading}
            timeRange={timeRange}
            updateExpanded={(expanded) => updateExpanded("artists", expanded)}
          />

          <RecentlyPlayed
            displayName={user.name}
            recentlyPlayed={recentlyPlayed}
          />
        </TabsContent>
        <TabsContent value="history">
          <p className="text-xl font-medium mt-5">
            {listeningHistory?.history?.timeMessage}
          </p>
          <div className="space-y-4 flex flex-col mt-10">
            <h2 className="text-2xl font-semibold">Top #10 Tracks</h2>
            <p className="mt-1 text-muted-foreground">
              {user.name}'s top tracks of all time.
            </p>

            {listeningHistory?.tracks
              ?.sort((a, b) => a.rank - b.rank)
              .map((track) => (
                <Link
                  className="p-3 bg-[#212121]/40 rounded-lg"
                  href={`/track/${track.trackId}`}
                  key={`history_${track.trackId}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("text-xl font-semibold", {
                        "text-muted-foreground": track.rank > 2,
                        "text-yellow-300": track.rank === 0,
                        "text-emerald-400": track.rank === 1,
                      })}
                    >
                      #{track.rank + 1}
                    </span>
                    <h3 className="text-2xl font-medium">{track.trackName}</h3>
                  </div>
                  <p className="mt-2">{track.artistName}</p>
                </Link>
              ))}
          </div>
          <div className="space-y-4 flex flex-col mt-10">
            <h2 className="text-2xl font-semibold">Top #10 Artists</h2>
            <p className="mt-1 text-muted-foreground">
              {user.name}'s top artists of all time.
            </p>

            {listeningHistory?.artists
              ?.sort((a, b) => a.rank - b.rank)
              .map((artist) => (
                <Link
                  className="p-3 rounded-lg"
                  href={`/artist/${artist.artistId}`}
                  key={`history_${artist.artistId}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("text-xl font-semibold", {
                        "text-muted-foreground": artist.rank > 2,
                        "text-yellow-300": artist.rank === 0,
                        "text-emerald-400": artist.rank === 1,
                      })}
                    >
                      #{artist.rank + 1}
                    </span>
                    <h3 className="text-2xl font-medium">
                      {artist.artistName}
                    </h3>
                  </div>
                </Link>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
