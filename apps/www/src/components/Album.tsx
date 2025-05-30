import Link from "next/link";
import type { Album as AlbumType } from "@/types/spotify";
import type { Albums as AlbumDBType } from "@workspace/database/schema";

export interface AlbumProps {
  album: AlbumType | AlbumDBType;
  index: number;
}

export function Album({ album, index }: AlbumProps) {
  const spotifyAlbum = "images" in album;

  const imageUrl = spotifyAlbum
    ? (album as AlbumType).images[0]?.url
    : (album as AlbumDBType).albumCover;

  return (
    <div className="aspect-square">
      <Link href={`/album/${album.id}`}>
        <img
          src={imageUrl}
          alt={`${album.name} Cover`}
          className="rounded-md w-full h-full object-cover"
        />
        <p className="mt-2 text-lg font-semibold line-clamp-2">
          <span className="text-xl">{index + 1}.</span> {album.name}
        </p>
      </Link>
      <li className="mt-1 line-clamp-2">
        {spotifyAlbum
          ? album.artists.map((artist, i) => (
              <Link href={`/artist/${artist.id}`} key={artist.id}>
                <div className="text-muted-foreground" key={artist.id}>
                  <span className="hover:text-foreground transition-colors">
                    {artist.name}
                  </span>
                  {i !== album.artists.length - 1 ? "," : null}
                </div>
              </Link>
            ))
          : null}
      </li>
    </div>
  );
}
