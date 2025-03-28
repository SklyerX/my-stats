import { env } from "@/env";
import { s3 } from "@/lib/s3-client";
import { createSpotifyArtistEntry } from "@/server/trpc/actions/create-spotify-artist-entry";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import {
  userExports,
  userListeningHistory,
  userTopArtists,
  type UserTopTrack,
  userTopTracks,
} from "@workspace/database/schema";
import { z } from "zod";

const schema = z.object({
  processId: z.string(),
  totalMs: z.number(),
  topArtists: z
    .object({
      count: z.number(),
      artist: z.string(),
      uri: z.string(),
    })
    .array(),
  topTracks: z
    .object({
      count: z.number(),
      track: z.string(),
      uri: z.string(),
      artist: z.string(),
    })
    .array(),
  timeMessage: z.string(),
  uniqueArtists: z.number(),
  uniqueTracks: z.number(),
  totalTracks: z.number(),
  listeningTime: z.object({
    hours: z.number(),
    minutes: z.number(),
  }),
  peakHour: z.number(),
});

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

  console.log("Data", data);

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
      createdAt: new Date(),
    })
    .returning();

  if (!history)
    return new Response(
      "Something went wrong while creating database records",
      { status: 500 },
    );

  console.log("History", history.id);

  const topTracks: Omit<UserTopTrack, "createdAt" | "id">[] =
    data.topTracks.map((track, i) => ({
      artistName: track.artist,
      historyId: history.id,
      rank: i,
      trackId: track.uri.split(":").at(2) || "",
      trackName: track.track,
      userId: existingExport.userId,
    }));

  const topArtists = data.topTracks.map((entry, i) => ({
    artistId: entry.uri.split(":").at(2) || "",
    artistName: entry.artist,
    historyId: history.id,
    rank: i,
    userId: existingExport.userId,
  }));

  await db.batch([
    db.insert(userTopTracks).values(topTracks),
    db.insert(userTopArtists).values(topArtists),
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
