import { Skeleton } from "@workspace/ui/components/skeleton";
import React from "react";

export default function PlaybackSkeleton() {
  return (
    <div className="mt-5 flex items-center gap-5">
      <Skeleton className="w-36 h-32" />
      <div className="w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-20 h-7" />
            <Skeleton className="w-20 h-7" />
          </div>
          <Skeleton className="w-20 h-7" />
        </div>
        <Skeleton className="w-32 h-7 mt-2" />
        <Skeleton className="w-full h-2 mt-2" />
        <div className="flex items-center justify-between mt-2">
          <Skeleton className="w-8 h-6 mt-2" />
          <Skeleton className="w-8 h-6 mt-2" />
        </div>
      </div>
    </div>
  );
}
