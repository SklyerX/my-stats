"use client";

import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import { TIME_RANGES, type TIME_RANGE } from "@/types/spotify";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import React from "react";

export default function TimeRangeClient() {
  const [timeRange, setTimeRange] = useQueryState(
    "time_range",
    parseAsStringLiteral(TIME_RANGES).withDefault("short_term"),
  );

  const router = useRouter();

  return (
    <TimeRangeSelector
      isLoading={false}
      timeRange={timeRange}
      onTimeRangeChange={(value) => {
        setTimeRange(value);
        router.refresh();
      }}
    />
  );
}
