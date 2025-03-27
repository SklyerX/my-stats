import UserProfile from "./_components/UserProfile";
import StatsContainer from "./_components/StatsContainer";
import { serverClient } from "@/server/trpc/server-client";
import { db } from "@workspace/database/connection";

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

  const listeningHistory = await db.query.userListeningHistory.findFirst({
    where: (fields, { eq }) => eq(fields.userId, data.user.id),
  });

  console.log({
    data,
    recentlyPlayed,
    listeningHistory,
  });

  return (
    <div>
      <UserProfile user={data.user} />
      <StatsContainer
        initialStats={data.stats}
        recentlyPlayed={recentlyPlayed}
        displayName={data.user.name}
        listeningHistory={listeningHistory}
      />
    </div>
  );
}
