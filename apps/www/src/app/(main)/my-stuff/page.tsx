import { getCurrentSession } from "@/auth/session";
import { Playlist } from "@/components/Playlist";
import { serverClient } from "@/server/trpc/server-client";
import RecentlyPlayedActions from "./_components/recently-played-actions";

export default async function MyStuff() {
  const { user } = await getCurrentSession();

  const [playlists, recentlyPlayed] = await Promise.all([
    serverClient.user.getPlaylists(),
    serverClient.user.recentlyPlayed({ slug: user?.slug as string }),
  ]);

  return (
    <div>
      <h2 className="text-3xl font-semibold">My Stuff</h2>
      <p className="text-muted-foreground max-w-2xl mb-5">
        My stuff shows your Spotify library and allows you to perform external
        operations on your playlists (this will not effect spotify)
      </p>
      <div className="mb-5">
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
      <RecentlyPlayedActions
        tracks={unique(recentlyPlayed, "id")}
        playlists={playlists.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
        }))}
      />
    </div>
  );
}

function unique<T>(array: T[], identifier: keyof T) {
  const seen = new Set();
  return array.filter((item) => {
    const key = JSON.stringify(item[identifier]);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
