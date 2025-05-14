import { SearchResults } from "@/components/search-results";
import { serverClient } from "@/server/trpc/server-client";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, Music } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SpotifySearchPage({ searchParams }: Props) {
  const query = (await searchParams).q;

  if (!query || Array.isArray(query)) redirect("/");

  const data = await serverClient.internal.spotifySearch({ query });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/search?q=${encodeURIComponent(query as string)}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-semibold">
          Spotify results for {decodeURIComponent(query as string)}
        </h2>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <p className="flex items-center gap-2 text-yellow-500">
          <Music className="size-5" />
          These results are from Spotify. Selecting an item will add it to
          MyStats.
        </p>
      </div>

      <SearchResults data={data} query={query} isSpotify />
    </div>
  );
}
