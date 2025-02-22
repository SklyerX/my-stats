import Link from "next/link";
import type { Album as AlbumType } from "@/types/spotify";

export interface AlbumProps {
  album: AlbumType;
  index: number;
}

export function Album({ album, index }: AlbumProps) {
  return (
    <Link href={`/album/${album.id}`}>
      <div className="aspect-square">
        <img
          src={album.images[0]?.url as string}
          alt={`${album.name} Cover`}
          className="rounded-md w-full h-full object-cover"
        />
        <p className="mt-2 text-lg font-semibold line-clamp-2">
          <span className="text-xl">{index + 1}.</span> {album.name}
        </p>
        <li className="mt-1 line-clamp-2">
          {album.artists.map((artist, i) => (
            <div className="text-muted-foreground" key={artist.id}>
              <span className="hover:text-foreground transition-colors">
                {artist.name}
              </span>
              {i !== album.artists.length - 1 ? "," : null}
            </div>
          ))}
        </li>
      </div>
    </Link>
  );
}
