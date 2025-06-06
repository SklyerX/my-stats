import UserProfile from "./_components/UserProfile";
import StatsContainer from "./_components/StatsContainer";
import { serverClient } from "@/server/trpc/server-client";
import { db } from "@workspace/database/connection";
import {
  type Artists,
  type Track,
  User,
  artists,
  integrations,
  tracks,
  userTopArtists,
  userTopTracks,
} from "@workspace/database/schema";
import { and, eq } from "@workspace/database/drizzle";
import { getCurrentSession } from "@/auth/session";
import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

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

  try {
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

    const [
      listeningHistory,
      topTracksResult,
      topArtistsResult,
      userIntegrations,
    ] = await db.batch([
      db.query.userListeningHistory.findFirst({
        where: (fields, { eq }) => eq(fields.userId, data.user.id),
        orderBy: (fields, { asc }) => asc(fields.createdAt),
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
      db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, data.user.id),
            eq(integrations.enabled, true),
          ),
        ),
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

    const authedUser = {
      id: session.user?.id,
      flags: session.user?.flags,
    };

    return (
      <div>
        <UserProfile
          slug={slug}
          session={session}
          user={data.user}
          integrations={userIntegrations}
        />
        <StatsContainer
          initialStats={data.stats}
          recentlyPlayed={recentlyPlayed}
          user={data.user}
          authedUser={authedUser}
          listeningHistory={result}
        />
      </div>
    );
  } catch (err) {
    if (err instanceof TRPCError) {
      if (err.code === "NOT_FOUND") notFound();
      console.error(`TRPC error: ${err.code}`, err.message);
    }
    throw err;
  }
}
