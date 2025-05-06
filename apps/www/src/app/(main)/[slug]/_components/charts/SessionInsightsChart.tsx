"use client";

import type { JSX } from "react";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import type { UserListeningHistory } from "@workspace/database/schema";

interface SessionInsightsChartProps {
  data: NonNullable<UserListeningHistory["longestSession"]>;
}

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--chart-1))",
  },
  unique: {
    label: "Unique",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function SessionInsightsChart({
  data,
}: SessionInsightsChartProps): JSX.Element {
  // Transform the data into the format expected by the chart
  const chartData = [
    {
      category: "Tracks",
      total: data.session_insights.total_tracks,
      unique: data.session_insights.unique_tracks,
    },
    {
      category: "Artists",
      total: data.session_insights.total_artists,
      unique: data.session_insights.unique_artists,
    },
  ];

  return (
    <Card className="my-10">
      <CardHeader>
        <CardTitle>Session Insights</CardTitle>
        <CardDescription>Tracks and Artists Overview</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            <Bar dataKey="unique" fill="var(--color-unique)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="leading-none text-muted-foreground">
          Comparing total vs unique tracks and artists in your session
        </div>
      </CardFooter>
    </Card>
  );
}
