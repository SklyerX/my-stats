import type { TRPCAlbumDataResponse } from "@/server/trpc/routers/albums/router";
import { serverClient } from "@/server/trpc/server-client";
import Link from "next/link";
import { FaSpotify } from "react-icons/fa";

interface Props {
  params: Promise<{
    albumId: string;
  }>;
}

function toTitleCase(str: string) {
  return str.substring(0, 1).toUpperCase() + str.substring(1, undefined);
}

export default async function AlbumsPage({ params }: Props) {
  const { albumId } = await params;
  const album = (await serverClient.albums.getAlbumData(
    albumId,
  )) as TRPCAlbumDataResponse;

  const formattedDate = new Intl.DateTimeFormat("en-US").format(
    new Date(album.releaseDate),
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center gap-5">
        <img
          src={album.albumCover}
          className="w-40 h-40 rounded-md"
          alt={`${album.name}'s Album Cover`}
        />
        <div>
          <h3 className="text-2xl font-semibold">{album.name}</h3>

          <p className="text-muted-foreground inline-flex items-center gap-1 text-xl">
            {album.albumsArtists.map(({ artist }, i) => (
              <Link
                href={`/artist/${artist?.artistId}`}
                className="text-muted-foreground hover:text-foreground transition-colors mt-2 font-medium"
                key={artist?.artistId}
              >
                {artist?.name}{" "}
                {i !== (album.albumsArtists.length ?? 0) - 1 ? "," : null}
              </Link>
            ))}
          </p>
          <Link
            href={`https://open.spotify.com/album/${album.albumId}`}
            target="_blank"
          >
            <FaSpotify className="mt-3 size-7 text-muted-foreground hover:text-foreground transition-colors" />
          </Link>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-16">
        <div className="flex flex-col mt-10">
          <p className="font-semibold text-2xl">{album.popularity / 10}</p>
          <span className="text-muted-foreground font-medium text-xl">
            popularity 0-10
          </span>
        </div>
        <div className="flex flex-col mt-10">
          <p className="font-semibold text-2xl">{album.totalTracks}</p>
          <span className="text-muted-foreground font-medium text-xl">
            tracks
          </span>
        </div>
        <div className="flex flex-col mt-10">
          <p className="font-semibold text-2xl">{formattedDate}</p>
          <span className="text-muted-foreground font-medium text-xl">
            release date
          </span>
        </div>
        <div className="flex flex-col mt-10">
          <p className="font-semibold text-2xl">
            {toTitleCase(album.albumType)}
          </p>
          <span className="text-muted-foreground font-medium text-xl">
            type of album
          </span>
        </div>
      </div>
      <div className="mt-10">
        <h3 className="text-3xl font-semibold">Album Tracks</h3>
        <p className="text-muted-foreground mt-px">
          tracks of <span className="font-semibold">{album.name}</span>
        </p>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {album.tracks
            .sort((a, b) => a.trackNumber - b.trackNumber)
            .map((track) => (
              <Link
                href={`/track/${track.id}`}
                className="flex gap-4"
                key={track.id}
              >
                <p className="text-muted-foreground font-semibold">
                  {track.trackNumber}.
                </p>
                <div>
                  <h3 className="text-xl font-medium">{track.name}</h3>
                  <p className="space-x-1">
                    {track.artists.map((artist, i) => (
                      <span
                        className="font-medium text-muted-foreground"
                        key={artist.id}
                      >
                        {artist.name}
                        {i !== track.artists.length - 1 ? "," : null}
                      </span>
                    ))}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
