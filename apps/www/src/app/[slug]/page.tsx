import UserProfile from "./_components/UserProfile";
import StatsContainer from "./_components/StatsContainer";
import { serverClient } from "@/server/trpc/server-client";
import { db } from "@workspace/database/connection";
import {
  type Artists,
  type Track,
  artists,
  tracks,
  userTopArtists,
  userTopTracks,
} from "@workspace/database/schema";
import { eq } from "@workspace/database/drizzle";
import { getCurrentSession } from "@/auth/session";

interface Props {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    time_range?: "short_term" | "medium_term" | "long_term";
  }>;
}

export default async function UserPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { time_range } = await searchParams;

  const [data, recentlyPlayed, session] = await Promise.all([
    serverClient.user.top({
      slug,
      time_range: time_range ?? "short_term",
    }),
    serverClient.user.recentlyPlayed({
      slug,
    }),
    getCurrentSession(),
  ]);

  const [listeningHistory, topTracksResult, topArtistsResult] = await db.batch([
    db.query.userListeningHistory.findFirst({
      where: (fields, { eq }) => eq(fields.userId, data.user.id),
    }),
    db
      .select({
        track: tracks,
      })
      .from(userTopTracks)
      .where(eq(userTopTracks.userId, data.user.id))
      .leftJoin(tracks, eq(userTopTracks.trackId, tracks.trackId)),
    db
      .select({
        artist: artists,
      })
      .from(userTopArtists)
      .where(eq(userTopArtists.userId, data.user.id))
      .leftJoin(artists, eq(userTopArtists.artistId, artists.artistId)),
  ]);

  const tracksData = topTracksResult
    .map((item) => item.track)
    .filter((track): track is Track => track !== null);

  const artistsData = topArtistsResult
    .map((item) => item.artist)
    .filter((artist): artist is Artists => artist !== null);

  const result = {
    history: listeningHistory,
    tracks: tracksData,
    artists: artistsData,
  };

  return (
    <div>
      <UserProfile slug={slug} session={session} user={data.user} />
      <StatsContainer
        initialStats={data.stats}
        recentlyPlayed={recentlyPlayed}
        user={data.user}
        listeningHistory={result}
      />
    </div>
  );
}
