import type { UserListeningHistory } from "@workspace/database/schema";
import React, { useState } from "react";
import Heatmap from "../charts/Heatmap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface Props {
  data: NonNullable<UserListeningHistory["heatmapData"]>;
}

export default function HeatmapSection({ data }: Props) {
  const [year, setYear] = useState<number | undefined>(
    data.years[data.years.length - 1],
  );

  if (!year) return;

  return (
    <div className="mb-4">
      <Select
        onValueChange={(value) => setYear(Number(value))}
        value={year.toString()}
      >
        <SelectTrigger className="w-[180px] mb-4">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {data.years.map((year) => (
            <SelectItem value={year.toString()} key={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Heatmap data={data} year={year} />
    </div>
  );
}
