"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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

interface Props {
  weekdayAvg: number;
  weekendAvg: number;
  dayCountMap: {
    [key: string]: number;
  };
  mostActiveDay: string;
}

const dayNames: { [key: string]: string } = {
  "0": "Sunday",
  "1": "Monday",
  "2": "Tuesday",
  "3": "Wednesday",
  "4": "Thursday",
  "5": "Friday",
  "6": "Saturday",
};

export function WeekdayAverage({ data }: { data: Props }) {
  const chartData = Object.entries(data.dayCountMap).map(([dayNum, count]) => ({
    day: dayNames[dayNum],
    streams: count,
    isWeekend: dayNum === "0" || dayNum === "6",
  }));

  const difference = data.weekdayAvg - data.weekendAvg;
  const percentDifference = ((difference / data.weekendAvg) * 100).toFixed(1);
  const trend = difference > 0 ? "up" : "down";

  const chartConfig = {
    streams: {
      label: "streams",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yearly Day Activity</CardTitle>
        <CardDescription>
          Showing listening counts for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="streams"
              type="natural"
              fill="var(--color-streams)"
              fillOpacity={0.4}
              stroke="var(--color-streams)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            Weekday traffic {trend} by {Math.abs(Number(percentDifference))}%
            compared to weekends
            <TrendingUp
              className={`h-4 w-4 ${difference < 0 ? "rotate-180" : ""}`}
            />
          </div>
          <div className="flex items-center gap-2 leading-none text-muted-foreground">
            Most active day: {data.mostActiveDay} (
            {
              data.dayCountMap[
                Object.keys(dayNames).find(
                  (key) => dayNames[key] === data.mostActiveDay,
                ) || "3"
              ]
            }{" "}
            streams)
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
