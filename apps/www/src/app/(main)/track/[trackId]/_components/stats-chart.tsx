// stats-chart.tsx
"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import {
  extractAudioFeaturePercentages,
  getRadarChartData,
  type AudioFeatures,
} from "@/lib/audio-features-utils";
import { cn } from "@workspace/ui/lib/utils";

const chartConfig = {
  audioProfile: {
    label: "Audio Profile",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

interface Props {
  audioFeatures: AudioFeatures;
  className?: string;
}

export function StatsCharts({ audioFeatures, className = "" }: Props) {
  const percentages = extractAudioFeaturePercentages(audioFeatures);
  const chartData = getRadarChartData(percentages);

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("aspect-square w-full", className)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} outerRadius="80%">
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <PolarAngleAxis
            dataKey="characteristic"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
          />
          <PolarGrid stroke="hsl(var(--border))" />
          <Radar
            name="Audio Profile"
            dataKey="value"
            fill="var(--color-audioProfile)"
            fillOpacity={0.6}
            stroke="var(--color-audioProfile)"
            dot={{
              r: 4,
              fillOpacity: 1,
              stroke: "var(--color-audioProfile)",
              strokeWidth: 2,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
