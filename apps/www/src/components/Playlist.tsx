import type { SimplifiedPlaylist } from "@/types/spotify";
import Link from "next/link";
import React from "react";

export interface PlaylistProps {
  playlist: SimplifiedPlaylist;
  asLink?: {
    href: string;
  };
}

export function Playlist({ playlist, asLink }: PlaylistProps) {
  const content = (
    <div className="aspect-square">
      <div>
        <div className="relative">
          <img
            src={playlist.images?.[0]?.url ?? "https://placehold.co/1000"}
            alt={`${playlist.name} Track Cover`}
            className="rounded-md w-full h-full object-cover"
          />
        </div>
        <p className="mt-2 text-lg font-semibold line-clamp-2">
          {playlist.name}
        </p>
      </div>
    </div>
  );

  return asLink ? (
    <Link href={asLink.href} className="aspect-square">
      {content}
    </Link>
  ) : (
    <div className="aspect-square">{content}</div>
  );
}
