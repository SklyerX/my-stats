import type { UserListeningHistory } from "@workspace/database/schema";
import React from "react";
import HourlyChart from "../charts/HourlyChart";
import { WeekdayAverage } from "../charts/WeekdayAverage";

interface Props {
  timesOfDay: UserListeningHistory["timesOfDay"];
  weekdayAnalysis: UserListeningHistory["weekdayAnalysis"];
}

export default function StreamingStats({ timesOfDay, weekdayAnalysis }: Props) {
  return (
    <>
      <h2 className="text-xl font-bold mb-4">Streaming Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
        {timesOfDay && (
          <HourlyChart data={timesOfDay.sort((a, b) => a.hour - b.hour)} />
        )}
        {weekdayAnalysis && <WeekdayAverage data={weekdayAnalysis} />}
      </div>
    </>
  );
}
