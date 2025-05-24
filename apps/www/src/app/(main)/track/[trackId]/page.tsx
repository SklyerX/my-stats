import { serverClient } from "@/server/trpc/server-client";
import Link from "next/link";
import { FaSpotify } from "react-icons/fa";
import Statistics from "./_components/statistics";
import { StatsCharts } from "./_components/stats-chart";

interface Props {
  params: Promise<{
    trackId: string;
  }>;
}

function msToMinute(ms: number) {
  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms / 1000) % 60);

  return `${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
}

export default async function TrackPage({ params }: Props) {
  const { trackId } = await params;
  const data = await serverClient.tracks.getTrackData(trackId);

  if (!data.track)
    return (
      <div>
        Sorry it looks this track doesn't exist in our database. Try refreshing
        your browser or come back at a different time
      </div>
    );

  return (
    <div className="px-5 sm:px-0">
      <div className="flex flex-col md:flex-row items-center gap-5">
        <img
          src={data.track.imageUrl}
          alt={`${data.track.artists?.[0]?.name ?? "Artists"}'s Profile`}
          className="w-40 h-40 rounded-md object-cover"
        />
        <div>
          <h3 className="text-3xl font-bold">{data.track.name}</h3>
          <p className="text-muted-foreground inline-flex items-center gap-1 text-xl">
            {data.track.artists.map((artist, i) => (
              <Link
                href={`/artist/${artist.id}`}
                className="text-muted-foreground hover:text-foreground transition-colors mt-2 font-medium"
                key={artist.id}
              >
                {artist.name}{" "}
                {i !== (data.track?.artists?.length ?? 0) - 1 ? "," : null}
              </Link>
            ))}
          </p>
          <Link
            href={`https://open.spotify.com/track/${trackId}`}
            target="_blank"
          >
            <FaSpotify className="size-6 mt-3 text-muted-foreground hover:text-foreground transition-colors" />
          </Link>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-10">
        <div className="flex flex-col mt-10">
          <p className="font-semibold text-2xl">
            {msToMinute(data.track.duration)}
          </p>
          <span className="text-muted-foreground font-medium text-xl">
            duration
          </span>
        </div>
        <div className="flex flex-col mt-10">
          <p className="font-semibold text-2xl">{data.track.popularity / 10}</p>
          <span className="text-muted-foreground font-medium text-xl">
            popularity 0-10
          </span>
        </div>
      </div>
      <div className="mt-10">
        <h3 className="text-3xl font-semibold">Seen on</h3>
        <p className="text-muted-foreground mt-px">
          albums with <span className="font-semibold">{data.track.name}</span>
        </p>
        <div className="mt-5">
          <Link href={`/album/${data.track.albumId}`}>
            <img
              src={data.track.imageUrl}
              alt={`${data.track.album}'s Album Cover`}
              className="w-40 h-40 rounded-md"
            />
            <h3 className="text-xl font-semibold mt-2">{data.track.album}</h3>
          </Link>
        </div>
      </div>
      <div className="mt-10">
        <h3 className="text-3xl font-semibold">Audio Features</h3>
        <p className="text-muted-foreground mt-px">
          Audio features of{" "}
          <span className="font-semibold">{data.track.name}</span>
        </p>
        {data.audio_features ? (
          <div>
            <div className="mt-6 flex flex-col lg:flex-row justify-center items-center gap-10">
              <Statistics
                audioFeatures={data.audio_features}
                className="w-full"
              />

              <StatsCharts
                audioFeatures={data.audio_features}
                className="w-full lg:w-2/3 max-w-xl mx-auto mt-6 lg:mt-0"
              />
            </div>
          </div>
        ) : (
          <p>
            Unfortunately it looks we do not currently have audio features for
            this track!
          </p>
        )}
        {data.audio_features ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 w-full max-w-md">
            <div className="py-5 px-2 rounded-md bg-secondary/40 flex flex-col items-center justify-center">
              <p className="text-lg font-semibold text-primary">
                {data.audio_features.low_level.loudness.toFixed(2)}
              </p>
              <p className="text-muted-foreground">Loudness</p>
            </div>
            <div className="py-5 px-2 rounded-md bg-secondary/40 flex flex-col items-center justify-center">
              <p className="text-lg font-semibold text-primary">
                <span className="uppercase">
                  {data.audio_features.low_level.key.scale.substr(0, 1)}
                </span>
                {data.audio_features.low_level.key.scale.substr(1, undefined)}
              </p>
              <p className="text-muted-foreground">Mode</p>
            </div>
            <div className="py-5 px-2 rounded-md bg-secondary/40 flex flex-col items-center justify-center">
              <p className="text-lg font-semibold text-primary">
                {data.audio_features.low_level.key.key}
              </p>
              <p className="text-muted-foreground">Major</p>
            </div>
            <div className="py-5 px-2 rounded-md bg-secondary/40 flex flex-col items-center justify-center">
              <p className="text-lg font-semibold text-primary">
                {data.audio_features.low_level.brightness.toFixed(2)}
              </p>
              <p className="text-muted-foreground">Brightness</p>
            </div>
            <div className="py-5 px-2 rounded-md bg-secondary/40 flex flex-col items-center justify-center">
              <p className="text-lg font-semibold text-primary">
                {data.audio_features.low_level.tuning_frequency.toFixed(2)}Hz
              </p>
              <p className="text-muted-foreground">Frequency</p>
            </div>
            <div className="py-5 px-2 rounded-md bg-secondary/40 flex flex-col items-center justify-center">
              <p className="text-lg font-semibold text-primary">
                {data.audio_features.low_level.bpm.toFixed(2)}
              </p>
              <p className="text-muted-foreground">BPM</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
