import { formatFollowerCount, toTitleCase } from "@/lib/utils";
import { serverClient } from "@/server/trpc/server-client";
import { cookies } from "next/headers";
import Link from "next/link";
import ShowGenreWarning from "./_components/ShowGenreWarning";
import { COOKIE_VALUES } from "@/types";

interface Props {
  params: Promise<{
    genre: string;
  }>;
}

export default async function GenresPage({ params }: Props) {
  const { genre } = await params;
  const decodedGenre = decodeURIComponent(genre);

  const artists = await serverClient.artists.getArtistsByGenre(decodedGenre);

  const showGenreWarning =
    (await cookies()).get(COOKIE_VALUES.SHOW_GENRE_WARNING)?.value === "true";

  return (
    <div>
      {!showGenreWarning && <ShowGenreWarning genre={decodedGenre} />}
      <h2 className="text-4xl font-semibold">{toTitleCase(decodedGenre)}</h2>
      {artists.length === 0 && (
        <div className="mt-10 flex flex-col space-">
          <h3 className="text-3xl font-semibold">You got us!</h3>
          <p className="text-muted-foreground">
            Our database doesn't not have enough data yet. Sorry for this
            inconvenience. We are actively working to build our genre
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 mt-10">
        {artists.length > 0 &&
          artists.map((artist, i) => (
            <div className="group flex flex-col items-center" key={artist.id}>
              <Link href={`/artist/${artist.artistId}`}>
                <div className="w-full mb-4">
                  <img
                    src={artist.imageUrl || "https://via.placeholder.com/1000"}
                    alt={`${artist.name}'s Profile`}
                    className="w-full aspect-square rounded-full object-cover group-hover:opacity-80 transition-opacity"
                  />
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <h3 className="font-semibold text-xl text-center">
                    {artist.name}
                  </h3>
                  <p className="text-base text-muted-foreground font-medium">
                    {formatFollowerCount(artist.followerAmount as number)}{" "}
                    Followers
                  </p>
                </div>
              </Link>
              <p className="text-sm text-muted-foreground/80 line-clamp-1">
                {artist.genres.map((genre, i) => (
                  <span
                    className="text-muted-foreground"
                    key={`${genre}-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                      i
                    }`}
                  >
                    <Link href={`/genre/${encodeURIComponent(genre)}`}>
                      <span className="hover:text-foreground transition-colors">
                        {genre}
                      </span>
                    </Link>
                    {i !== artist.genres.length - 1 ? ", " : null}
                  </span>
                ))}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
