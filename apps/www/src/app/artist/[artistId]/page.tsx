import { formatFollowerCount } from "@/lib/utils";
import { serverClient } from "@/server/trpc/server-client";
import Link from "next/link";
import { FaSpotify } from "react-icons/fa";

interface Props {
  params: Promise<{
    artistId: string;
  }>;
}

export default async function ArtistsPage({ params }: Props) {
  const { artistId } = await params;

  const data = await serverClient.artists.getArtistData(artistId);

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
              href={`https://open.spotify.com/artist/${data.artist.id}`}
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
        <h3 className="text-3xl font-semibold">Top Tracks</h3>
        <p className="text-muted-foreground mt-px">
          {data?.artist?.name}'s top tracks
        </p>
        <div className="flex items-center gap-2 mt-2">
          {data?.stats?.topTracks.map((track) => (
            <div key={track.id}>{track.name}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
