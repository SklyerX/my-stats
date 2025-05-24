import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import type { Artist as ArtistType } from "@/types/spotify";
import {
  artists,
  type Artists as ArtistDBType,
} from "@workspace/database/schema";

export interface ArtistProps {
  artist: ArtistType | ArtistDBType;
  index: number;
  noColor?: boolean;
}

function isSpotifyArtist(artist: ArtistType | ArtistDBType) {
  return "images" in artist;
}

export function Artist({ artist, noColor, index }: ArtistProps) {
  return (
    <Link
      href={`/artist/${isSpotifyArtist(artist) ? (artist as ArtistType).id : (artist as ArtistDBType).artistId}`}
    >
      <div className="aspect-square">
        <img
          src={
            isSpotifyArtist(artist)
              ? (artist.images[0]?.url ?? "")
              : (artist.imageUrl ?? "")
          }
          alt={artist.name}
          className="rounded-full w-full h-full object-cover"
        />
        <div className="mt-2 font-semibold text-lg text-center">
          <span
            className={cn("text-xl", {
              "text-yellow-300": index === 0 && !noColor,
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
