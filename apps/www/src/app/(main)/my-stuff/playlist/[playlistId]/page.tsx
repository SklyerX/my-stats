import { Artist } from "@/components/Artist";
import { serverClient } from "@/server/trpc/server-client";
import { buttonVariants } from "@workspace/ui/components/button";
import { millisecondsToHours } from "date-fns";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import React from "react";
import { ArtistDenominationChart } from "../_components/denomination-chart";
import PlaylistActions from "../_components/playlist-actions";

interface Props {
  params: Promise<{
    playlistId: string;
  }>;
}

export default async function PlaylistPage({ params }: Props) {
  const { playlistId } = await params;

  const data = await serverClient.user.getPlaylistStats({ playlistId });

  const { hours, remainder } = msToHoursWithRemainder(data.totalDurationMs);

  return (
    <div>
      <Link
        href="/playlists"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          class: "flex items-center gap-2",
        })}
      >
        <ChevronLeft className="size-4" />
        Go Back
      </Link>
      <div className="flex items-center gap-5 mt-10">
        <img
          src={data.playlist.images?.[0]?.url || "https://via.placeholder.com"}
          alt="Spotify Playlist Cover"
          className="w-36 h-36 rounded-md object-cover"
        />
        <div className="w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-5xl font-semibold mb-3">
              {data.playlist.name}
            </h2>
            <PlaylistActions playlistId={playlistId} />
          </div>
          {data.playlist.description ? (
            <p className="text-muted-foreground mb-2 text-xl">
              {data.playlist.description}
            </p>
          ) : null}
          <p className="text-xl space-x-1 text-muted-foreground">
            <span>{hours}h</span>
            <span>{remainder}m</span>
          </p>
        </div>
      </div>
      <div className="mt-10">
        <h3 className="text-2xl font-semibold mb-2">
          Top Artists denomination
        </h3>
        <p className="text-muted-foreground">
          Your top artists in this playlist
        </p>
        <div className="flex flex-col md:flex-row items-center gap-20 mt-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {data.popularArtists.map((artist) => (
              <Link
                href={`/artist/${artist.id}`}
                className="flex flex-col items-center"
                key={artist.id}
              >
                {"images" in artist ? (
                  <img
                    src={artist.images[0]?.url}
                    alt={artist.name}
                    className="rounded-full w-28 h-28 object-cover"
                  />
                ) : null}
                <h3 className="text-lg font-semibold truncate mt-2">
                  {artist.name}
                </h3>
              </Link>
            ))}
          </div>
          <div className="flex-1">
            <ArtistDenominationChart
              className="w-full max-w-lg"
              data={data.popularArtists.map((artist) => ({
                artistName: artist.name,
                count: artist.count,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function msToHoursWithRemainder(ms: number) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const remainder = Math.floor((ms % (1000 * 60 * 60)) / (60 * 1000));

  return { hours, remainder };
}
