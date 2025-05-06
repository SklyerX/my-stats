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
  Artists,
  Track,
  UserListeningHistory,
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

import { cn } from "@workspace/ui/lib/utils";
import { SessionInsightsChart } from "./charts/SessionInsightsChart";
import ListeningSessionStats from "./sections/ListeningSessionStats";
import StreamingStats from "./sections/StreamingStats";
import TopHistoryItems from "./sections/TopHistoryItems";
import HeatmapSection from "./sections/HeatmapSection";
import { hasPrivacyFlag, PRIVACY_FLAGS, PRIVACY_OPTIONS } from "@/lib/flags";
import { TIME_RANGE_TEXT } from "@/lib/constants";
import { EyeOff } from "lucide-react";
import EmptyPlaceholder from "./EmptyPlaceholder";

interface Props {
  initialStats: Awaited<
    ReturnType<(typeof serverClient)["user"]["top"]>
  >["stats"];
  recentlyPlayed: Awaited<
    ReturnType<(typeof serverClient)["user"]["recentlyPlayed"]>
  >;
  user: Pick<
    Awaited<ReturnType<(typeof serverClient)["user"]["top"]>>["user"],
    "id" | "name" | "flags"
  >;
  listeningHistory?: {
    history: UserListeningHistory | undefined;
    tracks?: Track[] | undefined;
    artists?: Artists[] | undefined;
  } | null;
  authedUser?: {
    id?: string;
    flags?: number;
  };
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
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(["stats", "history"]).withDefault("stats"),
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

  const isOwnProfile = authedUser?.id === user.id;

  const isFeatureVisible = (privacyFlag: number) => {
    console.log("USER", user.flags);

    console.log("HAS FLAG?", hasPrivacyFlag(user.flags, privacyFlag));
    console.log(
      "FUNC?",
      user.flags && !hasPrivacyFlag(user.flags, privacyFlag),
    );

    const isPublic = !hasPrivacyFlag(user.flags, privacyFlag);

    console.log("SHOULD SHOW?", isPublic || isOwnProfile);

    return isPublic || isOwnProfile;
  };

  return (
    <div className="space-y-8 mt-10 p-5 w-full">
      <Tabs
        defaultValue={tab}
        onValueChange={(tab) => setTab(tab as "stats" | "history")}
      >
        <div
          className={cn(
            "flex flex-col sm:flex-row justify-between relative z-10",
            {
              "justify-end":
                !listeningHistory?.history ||
                !isFeatureVisible(PRIVACY_FLAGS.STREAMING_STATS),
            },
          )}
        >
          {isFeatureVisible(PRIVACY_FLAGS.STREAMING_STATS) &&
            listeningHistory?.history && (
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
                    {msToHours(listeningHistory.history.totalMs)}
                  </p>
                  <span className="text-muted-foreground font-medium text-xl">
                    Hours Streamed
                  </span>
                </div>
                <div className="flex flex-col">
                  <p className="font-semibold text-xl">
                    {f.format(
                      Math.round(msToMinutes(listeningHistory.history.totalMs)),
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
          {isFeatureVisible(PRIVACY_FLAGS.CURRENTLY_PLAYING) && (
            <Playback userId={user.id} />
          )}

          {isFeatureVisible(PRIVACY_FLAGS.TOP_GENRES) ? (
            <>
              {isOwnProfile && !isFeatureVisible(PRIVACY_FLAGS.TOP_GENRES) && (
                <p className="text-muted-foreground">
                  This is only visible to you.
                </p>
              )}

              <TopGenres
                genres={stats.genres}
                displayName={user.name}
                isLoading={isLoading}
                timeRange={timeRange}
              />
            </>
          ) : (
            <EmptyPlaceholder
              title="Top Genres"
              displayName={user.name}
              timeRange={timeRange}
            />
          )}

          {isFeatureVisible(PRIVACY_FLAGS.TOP_ALBUMS) ? (
            <>
              {isOwnProfile && !isFeatureVisible(PRIVACY_FLAGS.TOP_ALBUMS) && (
                <p className="text-muted-foreground">
                  This is only visible to you.
                </p>
              )}

              <TopAlbums
                albums={stats.albums}
                displayName={user.name}
                expanded={expanded.albums}
                isLoading={isLoading}
                timeRange={timeRange}
                updateExpanded={(expanded) =>
                  updateExpanded("albums", expanded)
                }
              />
            </>
          ) : (
            <EmptyPlaceholder
              title="Top Albums"
              displayName={user.name}
              timeRange={timeRange}
            />
          )}

          {isFeatureVisible(PRIVACY_FLAGS.TOP_TRACKS) ? (
            <>
              {isOwnProfile && !isFeatureVisible(PRIVACY_FLAGS.TOP_TRACKS) && (
                <p className="text-muted-foreground">
                  This is only visible to you.
                </p>
              )}

              <TopTracks
                tracks={stats.tracks}
                displayName={user.name}
                expanded={expanded.tracks}
                isLoading={isLoading}
                timeRange={timeRange}
                updateExpanded={(expanded) =>
                  updateExpanded("tracks", expanded)
                }
              />
            </>
          ) : (
            <EmptyPlaceholder
              title="Top Tracks"
              displayName={user.name}
              timeRange={timeRange}
            />
          )}

          {isFeatureVisible(PRIVACY_FLAGS.TOP_ARTISTS) ? (
            <>
              {isOwnProfile && !isFeatureVisible(PRIVACY_FLAGS.TOP_ARTISTS) && (
                <p className="text-muted-foreground">
                  This is only visible to you.
                </p>
              )}

              <TopArtists
                artists={stats.artists}
                displayName={user.name}
                expanded={expanded.artists}
                isLoading={isLoading}
                timeRange={timeRange}
                updateExpanded={(expanded) =>
                  updateExpanded("artists", expanded)
                }
              />
            </>
          ) : (
            <EmptyPlaceholder
              title="Top Artists"
              displayName={user.name}
              timeRange={timeRange}
            />
          )}

          {isFeatureVisible(PRIVACY_FLAGS.RECENTLY_PLAYED) ? (
            <>
              {isOwnProfile &&
                !isFeatureVisible(PRIVACY_FLAGS.RECENTLY_PLAYED) && (
                  <p className="text-muted-foreground">
                    This is only visible to you.
                  </p>
                )}

              <RecentlyPlayed
                displayName={user.name}
                recentlyPlayed={recentlyPlayed}
              />
            </>
          ) : (
            <EmptyPlaceholder
              title="Recently Played"
              displayName={user.name}
              timeRange={timeRange}
            />
          )}
        </TabsContent>
        <TabsContent value="history">
          <h3 className="text-2xl font-semibold mt-10">
            {user.name}'s Music Profile
          </h3>
          {isFeatureVisible(PRIVACY_FLAGS.PERSONALIZED_MESSAGES) && (
            <>
              {isOwnProfile &&
                !isFeatureVisible(PRIVACY_FLAGS.PERSONALIZED_MESSAGES) && (
                  <p className="text-muted-foreground">
                    This is only visible to you.
                  </p>
                )}

              <p className="text-lg text-zinc-400 mb-6 mt-2">
                {listeningHistory?.history?.timeMessage},{" "}
                {listeningHistory?.history?.travelerMessage}
              </p>
            </>
          )}

          {isFeatureVisible(PRIVACY_FLAGS.PERSONALIZED_MESSAGES) &&
            listeningHistory?.history?.heatmapData && (
              <HeatmapSection data={listeningHistory.history.heatmapData} />
            )}

          {isFeatureVisible(PRIVACY_FLAGS.LONGEST_SESSION) ? (
            listeningHistory?.history?.longestSession && (
              <>
                <ListeningSessionStats
                  session={listeningHistory.history.longestSession}
                />
                <SessionInsightsChart
                  data={listeningHistory.history.longestSession}
                />
              </>
            )
          ) : (
            <EmptyPlaceholder displayName={user.name} noTitle hideHeader />
          )}

          {isFeatureVisible(PRIVACY_FLAGS.SESSION_ANALYSIS) ? (
            listeningHistory?.history?.timesOfDay &&
            listeningHistory.history?.weekdayAnalysis && (
              <StreamingStats
                timesOfDay={listeningHistory?.history?.timesOfDay}
                weekdayAnalysis={listeningHistory?.history?.weekdayAnalysis}
              />
            )
          ) : (
            <EmptyPlaceholder displayName={user.name} noTitle hideHeader />
          )}

          {listeningHistory?.tracks && listeningHistory.artists && (
            <TopHistoryItems
              displayName={user.name}
              tracks={listeningHistory?.tracks}
              artists={listeningHistory?.artists}
              visible={{
                artists: isFeatureVisible(PRIVACY_FLAGS.TOP_ARTISTS_IMPORTED),
                tracks: isFeatureVisible(PRIVACY_FLAGS.TOP_TRACKS_IMPORTED),
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function msToMinutes(ms: number) {
  return ms / (1000 * 60);
}

function msToHours(ms: number) {
  return (ms / (1000 * 60 * 60)).toFixed(0);
}
