import UserProfile from "./_components/UserProfile";
import StatsContainer from "./_components/StatsContainer";
import { serverClient } from "@/server/trpc/server-client";

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

  return (
    <div className="container mx-auto max-w-5xl w-full mt-20">
      <UserProfile user={data.user} />
      <StatsContainer
        initialStats={data.stats}
        recentlyPlayed={recentlyPlayed}
        displayName={data.user.name}
      />
    </div>
  );
}
