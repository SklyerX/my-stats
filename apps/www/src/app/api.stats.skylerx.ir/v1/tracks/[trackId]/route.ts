import { CACHE_TIMES } from "@/lib/constants";
import { db } from "@workspace/database/connection";

interface Props {
  params: Promise<{
    trackId: string;
  }>;
}

export async function GET(req: Request, { params }: Props) {
  const { trackId } = await params;

  const url = new URL(req.url);

  const include = url.searchParams.get("include");

  const existingTrack = await db.query.tracks.findFirst({
    where: (fields, { eq }) => eq(fields.trackId, trackId),
    with: {
      audioFeatures:
        include === "audio_features"
          ? {
              columns: {
                id: false,
                lastUpdated: false,
                mbid: false,
                spotifyId: false,
              },
            }
          : undefined,
    },
    columns: {
      id: false,
      updatedAt: false,
    },
  });

  if (!existingTrack)
    return new Response("Track not found in our database", { status: 404 });

  return new Response(JSON.stringify(existingTrack), {
    headers: {
      "Cache-Control": `private, max-age=${CACHE_TIMES.trackAudioFeatures}`,
    },
  });
}
