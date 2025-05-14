import { getCurrentSession } from "@/auth/session";
import { Album } from "@/components/Album";
import { Artist } from "@/components/Artist";
import { Track } from "@/components/Track";
import { TIME_RANGE_TEXT } from "@/lib/constants";
import { tryCatch } from "@/lib/try-catch";
import { serverClient } from "@/server/trpc/server-client";
import { TIME_RANGES, type TIME_RANGE } from "@/types/spotify";
import { TRPCError } from "@trpc/server";
import { X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IoContrast } from "react-icons/io5";
import TimeRangeClient from "./time-range-client";

interface Props {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Compare({ params, searchParams }: Props) {
  const { slug } = await params;
  let timeRange =
    ((await searchParams).timeRange as TIME_RANGE) || "short_term";

  if (!TIME_RANGES.includes(timeRange)) timeRange = "short_term";

  const { user, session } = await getCurrentSession();

  if (!user || !session) redirect(`/${slug}`);

  const { data: comparison, error } = await tryCatch(
    serverClient.user.compare({
      slug,
      timeRange,
    }),
  );

  if (error instanceof TRPCError && error.code === "BAD_REQUEST") {
    redirect(`/${slug}`);
  }

  if (error || !comparison)
    return (
      <div>
        <h3 className="text-2xl font-semibold">Something went wrong!</h3>
      </div>
    );

  const { users, similarities } = comparison;

  const renderSection = (
    title: string,
    data: any,
    renderItems: (items: any[]) => React.ReactNode,
    noSharingMessage = "This user does not share their top items",
  ) => {
    return (
      <div className="my-8">
        <h3 className="text-3xl font-semibold">{title}</h3>
        {"message" in data ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <X className="size-6" />
            <p className="text-lg">{noSharingMessage}</p>
          </div>
        ) : Array.isArray(data) && data.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5 mt-4">
            {renderItems(data)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <X className="size-6" />
            <p className="text-lg">
              Could not find any matches with {users.target.username} within the
              past {TIME_RANGE_TEXT[timeRange].toLowerCase()}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-center relative">
        <img
          src={users.target.image || "https://via.placeholder.com/1000"}
          alt="Target User Profile"
          className="rounded-full w-24 h-24"
        />
        <div className="absolute bg-background rounded-full p-3">
          <IoContrast className="size-4" />
        </div>
        <img
          src={users.self.image || "https://via.placeholder.com/1000"}
          alt="Your Profile"
          className="rounded-full w-24 h-24"
        />
      </div>

      <div className="my-5 flex justify-end">
        <TimeRangeClient />
      </div>

      {renderSection(
        "Similar Tracks",
        similarities.tracks,
        (tracks) =>
          tracks.map((track, i) => (
            <Track track={track} index={i} key={track.id} />
          )),
        "This user does not share their top tracks",
      )}

      {renderSection(
        "Similar Artists",
        similarities.artists,
        (artists) =>
          artists.map((artist, i) => (
            <Artist artist={artist} index={i} key={artist.id} />
          )),
        "This user does not share their top artists",
      )}

      {renderSection(
        "Similar Albums",
        similarities.albums,
        (albums) =>
          albums.map((album, i) => (
            <Album album={album} index={i} key={album.id} />
          )),
        "This user does not share their top albums",
      )}

      {renderSection(
        "Similar Genres",
        similarities.genres,
        (genres) =>
          genres.map((genre, i) => (
            <Link href={`/genre/${encodeURIComponent(genre)}`} key={genre}>
              <div className="flex-shrink-0 whitespace-nowrap bg-primary/40 px-3 rounded-sm">
                {genre}
              </div>
            </Link>
          )),
        "This user does not share their top genres",
      )}
    </div>
  );
}
