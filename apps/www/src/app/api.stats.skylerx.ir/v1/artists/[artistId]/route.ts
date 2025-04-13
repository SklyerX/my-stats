import { CACHE_TIMES } from "@/lib/constants";
import type { Album, Track } from "@/types/spotify";
import { db } from "@workspace/database/connection";
import type { Artists, ArtistsStats } from "@workspace/database/schema";

interface Props {
  params: Promise<{
    artistId: string;
  }>;
}

type ArtistWithStats = Artists &
  ArtistsStats & {
    stats: {
      topTracks: {
        tracks: Track[];
      };
      topAlbums: Album[];
    };
  };

export async function GET(req: Request, { params }: Props) {
  const { artistId } = await params;

  const existingArtist = await db.query.artists.findFirst({
    where: (fields, { eq }) => eq(fields.artistId, artistId),
    with: {
      relatedTo: {
        columns: {
          id: false,
          updatedAt: false,
        },
      },
      stats: true,
    },
    columns: {
      id: false,
      updatedAt: false,
    },
  });

  if (!existingArtist)
    return new Response("Track not found in our database", { status: 404 });

  const { stats, ...artist } = existingArtist as unknown as ArtistWithStats;

  const tracks = stats.topTracks.tracks.map((track) =>
    buildResponse("track", track),
  );
  const albums = stats.topAlbums.map((album) => buildResponse("album", album));

  return new Response(
    JSON.stringify({
      artist,
      topTracks: tracks,
      topAlbums: albums,
    }),
    {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_TIMES.relatedArtists}`,
      },
    },
  );
}

function buildResponse(type: "album" | "track", data: Album | Track) {
  if (type === "track") {
    const trackData = data as Track;
    return {
      name: trackData.name,
      album_name: trackData.album.name,
      cover_image: trackData.album.images.at(0)?.url,
      album_id: trackData.album.id,
      track_id: trackData.id,
      popularity: trackData.popularity,
      artists: trackData.artists.map((artist) => ({
        artistId: artist.id,
        name: artist.name,
      })),
    };
  }
  if (type === "album") {
    const albumData = data as Album;
    return {
      album_title: albumData.name,
      cover_image: albumData.images.at(0)?.url,
      release_date: albumData.release_date,
      total_tracks: albumData.total_tracks,
      artists: albumData.artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),
    };
  }
}
