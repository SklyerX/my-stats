import type { Artists, Track } from "@workspace/database/schema";
import React from "react";
import TopHistoryTrack from "../items/TopHistoryTrack";
import TopHistoryArtist from "../items/TopHistoryArtist";
import EmptyPlaceholder from "../EmptyPlaceholder";

interface Props {
  displayName: string;
  tracks: Track[];
  artists: Artists[];
  visible: {
    artists: boolean;
    tracks: boolean;
  };
}

function Header({
  className = "mt-10 mb-4",
  displayName,
}: { className?: string; displayName: string }) {
  return (
    <div className={className}>
      <h2 className="text-xl font-bold">Top Tracks</h2>
      <p className="text-muted-foreground">
        {displayName}'s top streamed tracks of all time
      </p>
    </div>
  );
}

export default function TopHistoryItems({
  displayName,
  tracks,
  artists,
  visible,
}: Props) {
  return (
    <>
      <Header displayName={displayName} />
      {visible.tracks ? (
        <div>
          {tracks?.map((track, i) => (
            <TopHistoryTrack key={track.trackId} track={track} index={i} />
          ))}
        </div>
      ) : (
        <EmptyPlaceholder displayName={displayName} hideHeader noTitle />
      )}

      <div className="mt-10 mb-4">
        <h2 className="text-xl font-bold">Top Artists</h2>
        <p className="text-muted-foreground">
          {displayName}'s top listened to artists of all time
        </p>
      </div>
      {visible.artists ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
          {artists?.map((artist, i) => (
            <TopHistoryArtist key={artist.artistId} artist={artist} index={i} />
          ))}
        </div>
      ) : (
        <EmptyPlaceholder displayName={displayName} hideHeader noTitle />
      )}
    </>
  );
}
