"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
  label: {
    color: "hsl(var(--background))",
  },
} satisfies ChartConfig;

interface Props {
  data: Array<{
    artistName: string;
    count: number;
  }>;
  className?: string;
}

export function ArtistDenominationChart({ data, className }: Props) {
  return (
    <ChartContainer
      config={chartConfig}
      className={cn("aspect-square w-full", className)}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{
          right: 16,
          top: 10,
          bottom: 10,
          left: 10,
        }}
        height={300}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="artistName"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          hide
        />
        <XAxis dataKey="count" type="number" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar
          dataKey="count"
          layout="vertical"
          fill="var(--color-count)"
          radius={4}
        >
          <LabelList
            dataKey="artistName"
            position="insideLeft"
            offset={8}
            className="fill-[--color-label]"
            fontSize={12}
          />
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
