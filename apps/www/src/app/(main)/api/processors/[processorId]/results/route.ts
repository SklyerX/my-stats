import { env } from "@/env";
import { decrypt } from "@/lib/encryption";
import {
  processMilestones,
  processMultipleMilestones,
} from "@/lib/milestone-service";
import { s3 } from "@/lib/s3-client";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import { chunks } from "@/lib/utils";
import { sendWebhook } from "@/lib/webhooks";
import type { Artist, Track } from "@/types/spotify";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@workspace/database/connection";
import { eq, sql } from "@workspace/database/drizzle";
import {
  tracks,
  userExports,
  userListeningHistory,
  userTopArtists,
  userTopTracks,
  type Track as DBTrack,
  type Artists as DBArtists,
  artists,
  webhookLogs,
} from "@workspace/database/schema";
import { z } from "zod";

interface Props {
  params: Promise<{
    processorId: string;
  }>;
}

export async function POST(req: Request, { params }: Props) {
  console.log("Entering results cb func");

  const body = await req.json();
  const { processorId } = await params;

  const appKey = req.headers.get("x-api-key");

  if (appKey !== env.APP_AUTH_KEY)
    return new Response("Unauthorized", { status: 401 });

  console.log("Processor ID", processorId);

  const { data, success } = schema.safeParse(body);

  console.log("Data", data);

  if (!success) {
    return new Response("Bad Request", { status: 400 });
  }

  console.log("success", success);

  const existingExport = await db.query.userExports.findFirst({
    where: (fields, { eq }) => eq(fields.exportId, processorId),
    with: {
      user: {
        with: {
          webhook: true,
        },
      },
    },
  });

  if (!existingExport)
    return new Response("Invalid Processor ID", { status: 404 });

  console.log("Existing Export", existingExport);

  const [history] = await db
    .insert(userListeningHistory)
    .values({
      userId: existingExport.userId,
      totalMs: data.totalMs,
      timeMessage: data.timeMessage,
      uniqueTracks: data.uniqueTracks,
      uniqueArtists: data.uniqueArtists,
      listeningHours: data.listeningTime.hours,
      listeningMinutes: data.listeningTime.minutes,
      peakHour: data.peakHour,
      totalTracks: data.totalTracks,
      heatmapData: data.heatmap,
      longestSession: {
        ...data.longest_session,
        duration: Number(data.longest_session.duration),
      },
      timesOfDay: data.times_of_day,
      weekdayAnalysis: data.weekday_analysis,
      travelerMessage: data.traveler_message,
      createdAt: new Date(),
    })
    .returning();

  if (!history)
    return new Response(
      "Something went wrong while creating database records",
      { status: 500 },
    );

  console.log("History", history.id);

  const accessToken = await getSystemAccessToken();
  const spotifyApi = new SpotifyAPI(accessToken);

  const trackIds = data.topTracks.map((track) => extractIdFromUri(track.uri));

  console.log(`Processing ${trackIds.length} tracks`);

  const fetchedTracks = [];
  const fetchedArtists = [];

  const uniqueTrackIds = [...new Set(trackIds)];

  for (const chunk of chunks(uniqueTrackIds, 50)) {
    const data = await spotifyApi.getMultipleTracks(chunk);
    fetchedTracks.push(...data);
  }

  const topTracksToSave = fetchedTracks.map((track, i) => ({
    userId: existingExport.userId,
    historyId: history.id,
    trackId: track.id,
    rank: i,
  }));

  const artistIds = fetchedTracks
    .filter((track) => track.artists.at(0)?.id)
    .map((track) => track.artists.at(0)?.id);

  const uniqueArtistIds = [...new Set(artistIds)];

  for (const chunk of chunks(uniqueArtistIds, 50)) {
    const data = await spotifyApi.getMultipleArtists(chunk as string[]);
    fetchedArtists.push(...data);
  }

  const topArtistsToSave = fetchedArtists.map((artist, i) => ({
    userId: existingExport.userId,
    historyId: history.id,
    artistId: artist.id,
    rank: i,
  }));

  const dbTracks = mapTracksToDB(fetchedTracks);
  const dbArtists = mapArtistsToDB(fetchedArtists);

  await db.batch([
    db
      .insert(tracks)
      .values(dbTracks)
      .onConflictDoUpdate({
        target: tracks.trackId,
        set: {
          popularity: sql`excluded.popularity`,
          updatedAt: sql`excluded.updated_at`,
        },
      }),
    db
      .insert(artists)
      .values(dbArtists)
      .onConflictDoUpdate({
        target: artists.artistId,
        set: {
          followerAmount: sql`excluded.follower_amount`,
          genres: sql`excluded.genres`,
          imageUrl: sql`excluded.image_url`,
          popularity: sql`excluded.popularity`,
          updatedAt: sql`excluded.updated_at`,
        },
      }),
    db.insert(userTopTracks).values(topTracksToSave),
    db.insert(userTopArtists).values(topArtistsToSave),
    db
      .update(userExports)
      .set({
        status: "completed",
      })
      .where(eq(userExports.exportId, processorId)),
  ]);

  await processMultipleMilestones(existingExport.userId, [
    {
      currentValue: data.aggregated_data.global_unique_artists,
      entityId: "",
      entityType: "artist",
      milestoneType: "unique_artists",
    },
    {
      currentValue: data.aggregated_data.global_unique_tracks,
      entityId: "",
      entityType: "track",
      milestoneType: "unique_tracks",
    },
    {
      currentValue: data.totalTracks,
      entityId: "",
      entityType: "global",
      milestoneType: "plays",
    },
    {
      currentValue: data.totalMs / (60 * 1000),
      entityId: "",
      entityType: "global",
      milestoneType: "minutes",
    },
  ]);

  const artistPlaysId: {
    spotifyId: string;
    for: string; // the URI we got this from
  }[] = [];

  const albumPlaysId: {
    spotifyId: string;
    for: string; // the URI we got this from
  }[] = [];

  for (const chunk of chunks(data.aggregated_data.artist_plays, 50)) {
    const trackIds = chunk
      .map((x) => extractIdFromUri(x.uri))
      .filter((id) => id && id.trim() !== "");

    if (trackIds.length === 0) continue;

    const data = await spotifyApi.getMultipleTracks(trackIds);

    artistPlaysId.push(
      ...data
        .filter((track) => track.artists.at(0)?.id !== undefined)
        .map((track) => ({
          spotifyId: track.artists.at(0)!.id as string,
          for: track.id,
        })),
    );
  }

  const totalMilestonesAchieved = [];

  for (const chunk of chunks(data.aggregated_data.album_plays, 50)) {
    const trackIds = chunk
      .map((x) => extractIdFromUri(x.track_uri))
      .filter((id) => id && id.trim() !== "");

    if (trackIds.length === 0) continue;

    const data = await spotifyApi.getMultipleTracks(trackIds);

    albumPlaysId.push(
      ...data
        .filter((track) => track.artists.at(0)?.id !== undefined)
        .map((track) => ({
          spotifyId: track.artists.at(0)!.id as string,
          for: track.id,
        })),
    );
  }

  for (const play of data.aggregated_data.artist_plays) {
    const entity = artistPlaysId.find(
      (a) => a.for === extractIdFromUri(play.uri),
    );
    totalMilestonesAchieved.push(
      await processMilestones(
        existingExport.userId,
        "artist",
        "plays",
        play.count,
        entity?.spotifyId,
      ),
    );
  }

  for (const minutes of data.aggregated_data.artist_minutes) {
    const entity = artistPlaysId.find(
      (a) => a.for === extractIdFromUri(minutes.uri),
    );
    totalMilestonesAchieved.push(
      await processMilestones(
        existingExport.userId,
        "artist",
        "minutes",
        minutes.ms / (60 * 1000),
        entity?.spotifyId,
      ),
    );
  }

  for (const album of data.aggregated_data.album_plays) {
    const entity = albumPlaysId.find(
      (a) => a.for === extractIdFromUri(album.track_uri),
    );
    totalMilestonesAchieved.push(
      await processMilestones(
        existingExport.userId,
        "album",
        "plays",
        album.count,
        entity?.spotifyId,
      ),
    );
  }

  for (const track of data.aggregated_data.track_plays) {
    totalMilestonesAchieved.push(
      await processMilestones(
        existingExport.userId,
        "track",
        "plays",
        track.count,
        extractIdFromUri(track.uri),
      ),
    );
  }

  const command = new DeleteObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: existingExport.fileName,
  });

  await s3.send(command);

  const webhook = existingExport.user.webhook;

  console.log("SENDING WEBHOOK");

  console.log("EXPORT", existingExport);

  if (webhook) {
    console.log("WEBHOOK FOUND");
    const secret = decrypt(
      webhook.webhook_secret.data,
      webhook.webhook_secret.iv,
      webhook.webhook_secret.tag,
    );

    const result = await sendWebhook({
      payload: {
        eventType: "milestone.achieved",
        timestamp: new Date().toISOString(),
        data: {
          userId: existingExport.userId,
          username: existingExport.user.username,
          milestoneCategories: calculateFinalMilestoneCounts(
            totalMilestonesAchieved,
          ),
          metadata: {
            dataFile: existingExport.fileName,
            processTime:
              (new Date().getTime() - existingExport.uploadDate!.getTime()) /
              (1000 * 60 * 60 * 24),
          },
        },
      },
      secret,
      url: webhook.url,
    });

    await db.insert(webhookLogs).values({
      status: result.isError ? "failed" : "success",
      webhookId: webhook.id,
      requestData: result.request,
      responseData: result.response,
      metadata: {
        for: "milestone",
        value: totalMilestonesAchieved.length.toString(),
        event: "milestone.achieved",
        user: existingExport.user.username,
        displayName: `${totalMilestonesAchieved.length} Milestone(s) achieved!`,
      },
    });
  }

  return new Response("Success", { status: 201 });
}

function mapTracksToDB(tracks: Track[]): Omit<DBTrack, "id" | "updatedAt">[] {
  return tracks.map((track) => ({
    album: track.album.name,
    albumId: track.album.id,
    artist: track.artists[0]?.name ?? "Unknown",
    duration: track.duration_ms,
    imageUrl: track.album.images.at(0)?.url ?? "",
    isrc: track.external_ids.isrc,
    name: track.name,
    popularity: track.popularity,
    trackId: track.id,
  }));
}

function mapArtistsToDB(
  artists: Artist[],
): Omit<DBArtists, "id" | "updatedAt">[] {
  return artists.map((artist) => ({
    followerAmount: artist.followers.total,
    genres: artist.genres,
    imageUrl: artist.images.at(0)?.url ?? "",
    name: artist.name,
    popularity: artist.popularity,
    artistId: artist.id,
  }));
}

function extractIdFromUri(uri: string): string {
  return uri.split(":").at(2) || "";
}

const schema = z.object({
  processId: z.string(),
  totalMs: z.number(),
  topArtists: z.array(
    z.object({
      count: z.number(),
      artist: z.string(),
      uri: z.string(),
    }),
  ),
  topTracks: z.array(
    z.object({
      count: z.number(),
      track: z.string(),
      uri: z.string(),
      artist: z.string(),
    }),
  ),
  timeMessage: z.string(),
  uniqueArtists: z.number(),
  uniqueTracks: z.number(),
  totalTracks: z.number(),
  listeningTime: z.object({
    hours: z.number(),
    minutes: z.number(),
  }),
  peakHour: z.number(),
  traveler_message: z.string(),
  times_of_day: z.array(
    z.object({
      count: z.number(),
      hour: z.number(),
    }),
  ),
  heatmap: z.object({
    dailyCounts: z.array(
      z.object({
        date: z.string(),
        count: z.number(),
      }),
    ),
    years: z.array(z.number()),
    maxCount: z.number(),
  }),
  weekday_analysis: z.object({
    dayCountMap: z.record(z.string(), z.number()),
    weekdayAvg: z.number(),
    weekendAvg: z.number(),
    mostActiveDay: z.string(),
  }),
  longest_session: z.object({
    sessionStart: z.string(),
    sessionEnd: z.string(),
    duration: z.union([z.string(), z.number()]),
    durationMinutes: z.number(),
    totalSessions: z.number(),
    session_insights: z.object({
      total_tracks: z.number(),
      unique_tracks: z.number(),
      total_artists: z.number(),
      unique_artists: z.number(),
    }),
  }),
  aggregated_data: z.object({
    artist_plays: z.array(
      z.object({
        count: z.number(),
        artist: z.string(),
        uri: z.string(),
      }),
    ),
    artist_minutes: z.array(
      z.object({
        name: z.string(),
        ms: z.number(),
        uri: z.string(),
      }),
    ),
    global_unique_artists: z.number(),
    global_unique_tracks: z.number(),
    album_plays: z.array(
      z.object({
        name: z.string(),
        count: z.number(),
        track_uri: z.string(),
      }),
    ),
    track_plays: z.array(
      z.object({
        count: z.number(),
        track: z.string(),
        uri: z.string(),
        artist: z.string(),
      }),
    ),
  }),
});

function calculateFinalMilestoneCounts(
  allResults: Array<{ milestone: string; count: number }[]>,
) {
  const totalCounts = new Map();

  for (const item of allResults.flat()) {
    if (item?.milestone) {
      const current = totalCounts.get(item.milestone) || 0;
      totalCounts.set(item.milestone, current + item.count);
    }
  }

  return Array.from(totalCounts.entries()).map(([milestone, count]) => ({
    milestone,
    count,
  }));
}
