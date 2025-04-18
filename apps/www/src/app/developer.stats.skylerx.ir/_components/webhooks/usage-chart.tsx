"use client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, subDays, parseISO } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import type { WebhookLogs } from "@workspace/database/schema";

const generateSampleData = () => {
  const data = [];
  for (let i = 14; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const count = Math.floor(Math.random() * 20) + 1;
    data.push({
      date: format(date, "yyyy-MM-dd"),
      count,
    });
  }
  return data;
};

function calculateData(logs: WebhookLogs[]) {
  const mapData = new Map<string, number>();

  // Group logs by date
  for (const log of logs) {
    if (!log.createdAt) continue;

    // Format date as YYYY-MM-DD
    const dateStr = format(log.createdAt, "yyyy-MM-dd");

    const count = mapData.get(dateStr) || 0;
    mapData.set(dateStr, count + 1);
  }

  // Convert map to array of objects
  const result = Array.from(mapData.entries()).map(([dateStr, count]) => ({
    date: dateStr,
    count,
  }));

  // Sort by date
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

const chartConfig = {
  logs: {
    label: "Webhook Logs",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

interface Props {
  logs: WebhookLogs[];
}

export function UsageChart({ logs }: Props) {
  // Use the fixed calculateData function
  const chartData = calculateData(logs);

  // If no data, use sample data for demonstration
  const displayData = chartData.length > 0 ? chartData : generateSampleData();

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base">Webhook Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <ChartContainer config={chartConfig} className="h-[500px] w-full">
          <AreaChart
            accessibilityLayer
            data={displayData}
            margin={{
              top: 5,
              left: 5,
              right: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={5}
              tickFormatter={(value) => format(parseISO(value), "MM/dd")}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={5}
              allowDecimals={false}
              tick={{ fontSize: 10 }}
              tickCount={4}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="count"
              name="logs"
              type="monotone"
              fill="var(--color-logs)"
              fillOpacity={0.4}
              stroke="var(--color-logs)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
