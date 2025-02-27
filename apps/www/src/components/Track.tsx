import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import type { Track as TrackType } from "@/types/spotify";

export interface TrackProps {
  track: TrackType;
  index: number;
  withCrown?: boolean;
}

export function Track({ track, index, withCrown = true }: TrackProps) {
  return (
    <Link href={`/track/${track.id}`}>
      <div className="aspect-square">
        <div className="relative">
          {index === 0 && withCrown && (
            <span className="absolute text-3xl z-40 -rotate-45 -left-5 -top-5">
              👑
            </span>
          )}
          <img
            src={track.album.images[0]?.url as string}
            alt={`${track.name} Track Cover`}
            className="rounded-md w-full h-full object-cover"
          />
        </div>

        <p className="mt-2 text-lg font-semibold line-clamp-2">
          <span
            className={cn("text-xl", {
              "text-yellow-300": index === 0,
            })}
          >
            {index + 1}.
          </span>{" "}
          {track.name}
        </p>
        <li className="mt-1 line-clamp-2">
          {track.artists.map((artist, i) => (
            <div className="text-muted-foreground" key={artist.id}>
              <span className="hover:text-foreground transition-colors">
                {artist.name}
              </span>
              {i !== track.artists.length - 1 ? "," : null}
            </div>
          ))}
        </li>
      </div>
    </Link>
  );
}
