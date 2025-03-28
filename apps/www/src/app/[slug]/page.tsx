import UserProfile from "./_components/UserProfile";
import StatsContainer from "./_components/StatsContainer";
import { serverClient } from "@/server/trpc/server-client";
import { db } from "@workspace/database/connection";
import {
  userListeningHistory,
  userTopArtists,
  userTopTracks,
} from "@workspace/database/schema";
import { eq, sql } from "@workspace/database/drizzle";

interface Props {
  params: {
    slug: string;
  };
  searchParams: {
    time_range?: "short_term" | "medium_term" | "long_term";
  };
}

export default async function UserPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { time_range } = await searchParams;

  const [data, recentlyPlayed] = await Promise.all([
    serverClient.user.top({
      slug,
      time_range: time_range ?? "short_term",
    }),
    serverClient.user.recentlyPlayed({
      slug,
    }),
  ]);

  const [listeningHistory, topTracks, topArtists] = await db.batch([
    db.query.userListeningHistory.findFirst({
      where: (fields, { eq }) => eq(fields.userId, data.user.id),
    }),
    db
      .select()
      .from(userTopTracks)
      .where(eq(userTopTracks.userId, data.user.id)),
    db
      .select()
      .from(userTopArtists)
      .where(eq(userTopArtists.userId, data.user.id)),
  ]);

  const result = {
    history: listeningHistory,
    tracks: topTracks,
    artists: topArtists,
  };

  console.log(result);

  return (
    <div>
      <UserProfile user={data.user} />
      <StatsContainer
        initialStats={data.stats}
        recentlyPlayed={recentlyPlayed}
        user={data.user}
        listeningHistory={result}
      />
    </div>
  );
}
