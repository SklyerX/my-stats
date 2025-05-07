import type { Artists } from "@workspace/database/schema";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import React from "react";
import type { JSX } from "react";

interface Props {
  artist: Artists;
  index: number;
}

export default function TopHistoryArtist({
  artist,
  index,
}: Props): JSX.Element {
  return (
    <>
      {/* @ts-ignore - Ignoring type issues with React 19 and Next.js Link */}
      <Link href={`/artist/${artist.id}`} legacyBehavior>
        <div className="aspect-square">
          <img
            src={artist.imageUrl || "https://via.placeholder.com/1000"}
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
    </>
  );
}
