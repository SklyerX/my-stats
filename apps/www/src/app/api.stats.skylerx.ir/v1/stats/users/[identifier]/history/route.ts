import { isDataVisible, PRIVACY_FLAGS } from "@/lib/flags";
import { db } from "@workspace/database/connection";

interface Props {
  params: Promise<{
    identifier: string;
  }>;
}

export async function GET(req: Request, { params }: Props) {
  const { identifier } = await params;

  const url = new URL(req.url);
  const fieldsToInclude = url.searchParams.get("include");

  const includeTopArtists = fieldsToInclude?.includes("artists")
    ? true
    : undefined;
  const includeTopTracks = fieldsToInclude?.includes("tracks")
    ? true
    : undefined;

  const existingUser = await db.query.users.findFirst({
    where: (fields, { or, eq }) =>
      or(eq(fields.id, identifier), eq(fields.slug, identifier)),
    with: {
      history: {
        limit: 1,
        orderBy: (fields, { asc }) => asc(fields.createdAt),
        with: {
          topArtists: includeTopArtists,
          topTracks: includeTopTracks,
        },
      },
    },
  });

  if (!existingUser) return new Response("User not found", { status: 404 });

  if (!existingUser.history)
    return new Response("This user has not imported their listening history", {
      status: 409,
    });

  const flags = existingUser.flags;
  const [history] = existingUser.history;

  const privacySettings = {
    streaming_stats: isDataVisible(flags, PRIVACY_FLAGS.STREAMING_STATS),

    personalized_messages: isDataVisible(
      flags,
      PRIVACY_FLAGS.PERSONALIZED_MESSAGES,
    ),

    heatmap: isDataVisible(flags, PRIVACY_FLAGS.HEATMAP),
    longest_session: isDataVisible(flags, PRIVACY_FLAGS.LONGEST_SESSION),

    session_analysis: isDataVisible(flags, PRIVACY_FLAGS.SESSION_ANALYSIS),

    top_tracks: isDataVisible(flags, PRIVACY_FLAGS.TOP_TRACKS_IMPORTED),

    top_artists: isDataVisible(flags, PRIVACY_FLAGS.TOP_ARTISTS_IMPORTED),
  };

  const data = {
    streaming_stats: privacySettings.streaming_stats
      ? {
          minutes: history?.listeningMinutes,
          hours: history?.listeningHours,
          unique_artists: history?.uniqueArtists,
          tracks: history?.uniqueTracks,
          streams: history?.totalTracks,
          peak_hour: history?.peakHour,
        }
      : null,
    personalized_messages: privacySettings.personalized_messages
      ? [history?.timeMessage, history?.travelerMessage]
      : null,
    heatmap: privacySettings.heatmap ? history?.heatmapData : null,
    listening_sessions: privacySettings.longest_session
      ? {
          total_sessions: history?.longestSession?.totalSessions,
          duration: history?.longestSession?.duration,
          started_at: history?.longestSession?.sessionStart,
          stopped_at: history?.longestSession?.sessionEnd,
          insights: {
            tracks: {
              total: history?.longestSession?.session_insights.total_tracks,
              unique: history?.longestSession?.session_insights.unique_tracks,
            },
            artists: {
              total: history?.longestSession?.session_insights.total_artists,
              unique: history?.longestSession?.session_insights.total_artists,
            },
          },
        }
      : null,
    hourly_activity: privacySettings.streaming_stats
      ? history?.timesOfDay
      : null,
    yearly_day_activity: privacySettings.streaming_stats
      ? history?.weekdayAnalysis
      : null,
    top_tracks: privacySettings.top_tracks ? history?.topTracks : null,
    top_artists: privacySettings.top_artists ? history?.topArtists : null,
  };

  return new Response(JSON.stringify(data), {
    headers: {
      "Cache-Control": "private, max-age=18000",
    },
  });
}
