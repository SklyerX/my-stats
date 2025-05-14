import { Album } from "@/components/Album";
import { Artist } from "@/components/Artist";
import { Track } from "@/components/Track";
import { User } from "@/components/User";
import type {
  Artist as ArtistType,
  Track as TrackType,
  Album as AlbumType,
} from "@/types/spotify";
import type {
  Artists as ArtistDBType,
  Track as TrackDBType,
  Albums as AlbumDBType,
  User as UserType,
} from "@workspace/database/schema";
import { X } from "lucide-react";

interface SearchResultsProps {
  data: {
    artists: ArtistType[] | ArtistDBType[];
    tracks: TrackType[] | TrackDBType[];
    albums: AlbumType[] | AlbumDBType[];
    users?: UserType[];
  };
  query: string;
  isSpotify?: boolean;
}

function EmptyPlaceholder({
  name,
  query,
  isSpotify,
}: { name: string; query: string; isSpotify: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
      <X className="size-5" />
      No {name} found for "{query}" {isSpotify ? "on spotify" : null}
    </div>
  );
}

export function SearchResults({
  data,
  query,
  isSpotify = false,
}: SearchResultsProps) {
  return (
    <div className="mt-10 space-y-8">
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold">Artists</h3>
        {data.artists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
            {data.artists.map((artist, index) => (
              <Artist artist={artist} index={index} key={artist.id} noColor />
            ))}
          </div>
        ) : (
          <EmptyPlaceholder
            name="artists"
            query={query}
            isSpotify={isSpotify}
          />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-semibold">Tracks</h3>
        {data.tracks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {data.tracks.map((track, index) => (
              <Track
                track={track}
                index={index}
                key={track.id}
                withCrown={false}
              />
            ))}
          </div>
        ) : (
          <EmptyPlaceholder name="tracks" query={query} isSpotify={isSpotify} />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-semibold">Albums</h3>
        {data.albums.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
            {data.albums.map((album, index) => (
              <Album album={album} index={index} key={album.id} />
            ))}
          </div>
        ) : (
          <EmptyPlaceholder name="albums" query={query} isSpotify={isSpotify} />
        )}
      </div>

      {!isSpotify && data.users && (
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold">Users</h3>
          {data.users.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
              {data.users.map((user) => (
                <User user={user} key={user.id} />
              ))}
            </div>
          ) : (
            <EmptyPlaceholder
              name="users"
              query={query}
              isSpotify={isSpotify}
            />
          )}
        </div>
      )}
    </div>
  );
}
