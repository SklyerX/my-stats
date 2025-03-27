"use client";

import { trpc } from "@/server/trpc/client";
import { buttonVariants } from "@workspace/ui/components/button";
import { motion } from "framer-motion";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import PlaybackSkeleton from "./PlaybackSkeleton";
import { Progress } from "@workspace/ui/components/progress";

// ADD SYNCING? Unsure because there is no webhook and skipped tracks or even ignored tracks could be logged as played with their full duration. Polling is a possible solution but it's not ideal.

interface Props {
  userId: string;
}

function msToTime(duration: number) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);

  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

  return `${minutes}:${formattedSeconds}`;
}

let interval: NodeJS.Timeout;

export default function Playback({ userId }: Props) {
  const [msProgress, setMsProgress] = useState(0);

  const { data, refetch, isLoading } = trpc.user.getPlayback.useQuery(
    {
      userId,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: false,
    },
  );

  const progressPercentage =
    (msProgress / (data?.item?.duration_ms || 0)) * 100 || 1;

  useEffect(() => {
    if (data?.item) {
      setMsProgress(data.progress_ms);

      if (!data.is_playing) {
        const timeout = setTimeout(() => {
          refetch();
        }, 10_000);
        return () => clearTimeout(timeout);
      }

      clearInterval(interval);

      interval = setInterval(() => {
        setMsProgress((msProgress) => {
          const newMsProgress = msProgress + 1000;

          if (newMsProgress >= data.item!.duration_ms) {
            refetch();
            clearInterval(interval);
            return 0;
          }
          return newMsProgress;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [data, refetch]);

  if (isLoading) {
    return <PlaybackSkeleton />;
  }

  if (!data || !data?.item) return null;

  return (
    <div className="mt-5 flex items-center gap-5">
      <img
        src={data.item.album.images[0]?.url}
        alt={data.item.name}
        className="w-28 h-2w-28 object-cover hidden sm:block"
      />
      <div className="w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {data.item.artists.map((artist, i) => (
              <Link href={`/artist/${artist.id}`} key={artist.id}>
                <div className="text-muted-foreground" key={artist.id}>
                  <span className="hover:text-foreground transition-colors">
                    {artist.name}
                  </span>
                  {i !== data.item?.artists?.length! - 1 ? "," : null}
                </div>
              </Link>
            ))}
          </div>
          <Link
            href={`/track/${data.item.id}`}
            className={buttonVariants({
              variant: "link",
              size: "sm",
              class: "flex items-center gap-2 !text-foreground",
            })}
          >
            <LinkIcon className="size-4" />
            Track
          </Link>
        </div>
        <h2 className="text-2xl font-semibold">{data.item.name}</h2>
        {/* <motion.div
          className="w-full rounded-full bg-gray-300 h-2 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-primary h-2 rounded-full"
            initial={{ width: "1%" }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ delay: 0.2 }}
          />
        </motion.div> */}
        <Progress value={progressPercentage} className="mt-2 h-2" />
        <div className="flex items-center justify-between mt-2">
          <p>{msToTime(msProgress)}</p>
          <p>{msToTime(data.item.duration_ms)}</p>
        </div>
      </div>
    </div>
  );
}
