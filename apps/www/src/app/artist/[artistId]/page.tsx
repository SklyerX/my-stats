import { AnimatedAlbum, AnimatedTrack } from "@/components/wrappers/animated";
import { formatFollowerCount } from "@/lib/utils";
import { serverClient } from "@/server/trpc/server-client";
import { Artists } from "@workspace/database/schema";
import Link from "next/link";
import { FaSpotify } from "react-icons/fa";

interface Props {
  params: Promise<{
    artistId: string;
  }>;
}

export default async function ArtistsPage({ params }: Props) {
  const { artistId } = await params;

  const [data, relatedArtists] = await Promise.all([
    serverClient.artists.getArtistData(artistId),
    serverClient.artists.getRelatedArtists(artistId),
  ]);

  return (
    <div className="space-y-8">
      {data?.artist ? (
        <div className="flex items-center gap-10">
          <img
            src={data.artist.imageUrl || "https://via.placeholder.com/1000"}
            alt={`${data.artist.name}'s Spotify Profile`}
            className="w-40 h-40 rounded-full object-cover"
          />
          <div>
            <h2 className="text-4xl font-semibold">{data.artist.name}</h2>
            <p className="text-muted-foreground text-xl mt-1">
              <span className="font-semibold">
                {formatFollowerCount(data.artist.followerAmount as number)}{" "}
              </span>
              Followers
            </p>
            <Link
              href={`https://open.spotify.com/artist/${data.artist.artistId}`}
              target="_blank"
              className="mt-3 block"
            >
              <FaSpotify className="size-7 text-muted-foreground hover:text-foreground transition-colors" />
            </Link>
          </div>
        </div>
      ) : (
        <div>skeleton</div>
      )}
      <div className="flex flex-col mt-10">
        <p className="font-semibold text-xl">
          {data?.artist?.popularity ? data.artist.popularity / 10 : "-"}
        </p>
        <span className="text-muted-foreground">popularity 0-10</span>
      </div>
      <div>
        <h3 className="text-3xl font-semibold">Genres</h3>
        <p className="text-muted-foreground mt-px">
          {data?.artist?.name}'s Genres
        </p>
        <div className="flex items-center gap-2 mt-2">
          {data?.artist?.genres.map((genre) => (
            <Link
              href={`/genre/${encodeURIComponent(genre)}`}
              className="bg-primary/40 px-3 rounded-sm"
              key={genre}
            >
              {genre}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-semibold">Top Albums</h3>
        <p className="text-muted-foreground mt-px">
          {data?.artist?.name}'s top albums
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5 mt-5">
          {data?.stats?.topAlbums.map((album, i) => (
            <AnimatedAlbum key={album.id} album={album} index={i} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-semibold">Top Tracks</h3>
        <p className="text-muted-foreground mt-px">
          {data?.artist?.name}'s top tracks
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5 mt-5">
          {data?.stats?.topTracks.tracks.map((track, i) => (
            <AnimatedTrack
              key={track.id}
              track={track}
              index={i}
              withCrown={false}
            />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-semibold">Related Artist</h3>
        <div className="flex items-center flex-wrap gap-5 mt-5">
          {relatedArtists.data?.map((artist) => (
            <Link
              href={`/artist/${artist.artistId}`}
              className="flex items-center gap-5"
              key={artist.id}
            >
              <img
                src={artist.imageUrl || "https://via.placeholder.com/1000"}
                className="w-10 h-10 rounded-full"
                alt={`${artist.name}'s Spotify Profile`}
              />
              <h3 className="text-xl font-semibold">{artist.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
