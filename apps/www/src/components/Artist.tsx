import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import type { Artist as ArtistType } from "@/types/spotify";

export interface ArtistProps {
  artist: ArtistType;
  index: number;
}

export function Artist({ artist, index }: ArtistProps) {
  return (
    <Link href={`/artist/${artist.id}`}>
      <div className="aspect-square">
        <img
          src={artist.images[0]?.url as string}
          alt={artist.name}
          className="rounded-full w-full h-full object-cover"
        />
        <div className="mt-2 font-semibold text-lg text-center">
          <span
            className={cn("text-xl", {
              "text-yellow-300": index === 0,
            })}
          >
            {index + 1}
          </span>
          . {artist.name}
        </div>
      </div>
    </Link>
  );
}
