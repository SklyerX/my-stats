import { Playlist } from "@/components/Playlist";
import { serverClient } from "@/server/trpc/server-client";
import { SimplifiedPlaylist } from "@/types/spotify";
import { Heart, Pin } from "lucide-react";
import Link from "next/link";
import React from "react";

export default async function MyStuff() {
  const playlists = await serverClient.user.getPlaylists();

  return (
    <div>
      <h2 className="text-3xl font-semibold">My Stuff</h2>
      <p className="text-muted-foreground max-w-2xl mb-5">
        My stuff shows your Spotify library and allows you to perform external
        operations on your playlists (this will not effect spotify)
      </p>
      <div>
        <h3 className="text-2xl font-semibold">Playlists</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 mt-5">
          {playlists.map((playlist) => (
            <Playlist
              playlist={playlist}
              key={playlist.id}
              asLink={{ href: `/my-stuff/playlist/${playlist.id}` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
