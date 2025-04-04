import { env } from "@/env";
import { s3 } from "@/lib/s3-client";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import { chunks } from "@/lib/utils";
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
      longestSession: data.longest_session,
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

  const command = new DeleteObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: existingExport.fileName,
  });

  await s3.send(command);

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

async function fetchInBatches<T>(
  ids: string[],
  fetchFn: (batchIds: string[]) => Promise<T[]>,
): Promise<T[]> {
  const results: T[] = [];

  for (const batch of chunks(ids, 50)) {
    const data = await fetchFn(batch);
    results.push(...data);
  }

  return results;
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
});
