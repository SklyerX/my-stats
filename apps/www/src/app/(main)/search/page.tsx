import { SearchResults } from "@/components/search-results";
import { serverClient } from "@/server/trpc/server-client";
import { buttonVariants } from "@workspace/ui/components/button";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const query = (await searchParams).q;

  if (!query || Array.isArray(query)) redirect("/");

  const data = await serverClient.internal.search({ query });

  return (
    <div>
      <h2 className="text-3xl font-semibold">
        Searching results for {decodeURIComponent(query)}
      </h2>
      <p className="text-muted-foreground">
        These results are from the MyStats database not from Spotify
      </p>
      <SearchResults data={data} query={query} />
      <div className="mt-8">
        <h3 className="text-3xl font-semibold mb-2">
          Not finding what you're looking for?
        </h3>
        <p className="text-muted-foreground mb-4">
          Some items may not be added in our database yet, try searching on
          Spotify for them.
        </p>
        <Link
          href={`/spotify-search?q=${encodeURIComponent(query)}`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Search on Spotify
        </Link>
      </div>
    </div>
  );
}
