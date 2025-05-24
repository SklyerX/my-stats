import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import type { Track as TrackType } from "@/types/spotify";
import type { Track as TrackDBType } from "@workspace/database/schema";

export interface TrackProps {
  track: TrackType | TrackDBType;
  index: number;
  withCrown?: boolean;
}

export function Track({ track, index, withCrown = true }: TrackProps) {
  const isSpotifyTrack = "album" in track && "artists" in track;

  const imageUrl = isSpotifyTrack
    ? (track as TrackType).album.images[0]?.url
    : (track as TrackDBType).imageUrl;

  const trackName = track.name;

  const trackId = isSpotifyTrack ? track.id : (track as TrackDBType).trackId;

  const artists = isSpotifyTrack
    ? (track as TrackType).artists
    : [
        {
          id: (track as TrackDBType).albumId,
          name: (track as TrackDBType).artist,
        },
      ];

  return (
    <div className="aspect-square">
      <Link href={`/track/${trackId}`}>
        <div className="relative">
          {index === 0 && withCrown && (
            <span className="absolute text-3xl z-40 -rotate-45 -left-5 -top-5">
              👑
            </span>
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={`${trackName} Track Cover`}
              className="rounded-md w-full h-full object-cover"
            />
          )}
        </div>
        <p className="mt-2 text-lg font-semibold line-clamp-2">
          <span
            className={cn("text-xl", {
              "text-yellow-300": index === 0,
            })}
          >
            {index + 1}.
          </span>{" "}
          {trackName}
        </p>
      </Link>
      <li className="mt-1 line-clamp-2">
        {artists.map((artist, i) => (
          <Link href={`/artist/${artist.id}`} key={artist.id || i}>
            <div className="text-muted-foreground" key={artist.id || i}>
              <span className="hover:text-foreground transition-colors">
                {artist.name}
              </span>
              {i !== artists.length - 1 ? "," : null}
            </div>
          </Link>
        ))}
      </li>
    </div>
  );
}
