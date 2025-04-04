import type { UserListeningHistory } from "@workspace/database/schema";
import { Card, CardContent } from "@workspace/ui/components/card";
import React from "react";

interface Props {
  data: NonNullable<UserListeningHistory["heatmapData"]>;
  year: number;
}

export default function Heatmap({ data, year }: Props) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const colorLevels = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

  const yearData = prepareYearData(data.dailyCounts, year);

  const getTooltipContent = (count: number, date: string) => {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `${count} streams on ${formattedDate}`;
  };

  const getCellColor = (count: number) => {
    if (count === 0) return colorLevels[0];
    if (count < 7) return colorLevels[1];
    if (count < 21) return colorLevels[2];
    if (count < 45) return colorLevels[3];
    return colorLevels[4];
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col space-y-4 max-w-6xl overflow-x-scroll">
          <div className="flex pl-10">
            {months.map((month, i) => (
              <div
                key={month}
                className="text-xs text-gray-500"
                style={{ width: yearData.monthLengths[i] * 16 }}
              >
                {month}
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="flex flex-col justify-around pr-2">
              {days.map(
                (day, i) =>
                  i % 2 === 0 && (
                    <div key={day} className="text-xs text-gray-500 h-4">
                      {day}
                    </div>
                  ),
              )}
            </div>

            {/* Cells */}
            <div className="grid grid-flow-col gap-1">
              {yearData.weeks.map((week, weekIndex) => (
                <div
                  key={`week-${weekIndex}`}
                  className="grid grid-flow-row gap-1"
                >
                  {week.map((day, dayIndex) => (
                    <div
                      key={`day-${weekIndex}-${dayIndex}`}
                      className="w-4 h-4 rounded-sm transition-colors duration-200 hover:ring-1 hover:ring-gray-400"
                      style={{ backgroundColor: getCellColor(day.count) }}
                      title={getTooltipContent(day.count, day.date as string)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div>
              {yearData.totalStreams} streams in {year}
              {yearData.maxDay && (
                <span className="ml-2 text-gray-500">
                  (Max: {yearData.maxDay.count} on{" "}
                  {new Date(
                    yearData.maxDay.date as string,
                  ).toLocaleDateString()}
                  )
                </span>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>Less</span>
              {colorLevels.map((color, i) => (
                <div
                  key={`legend-${i}`}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                  title={
                    i === 0
                      ? "No streams"
                      : i === 1
                        ? `1-${Math.floor(data.maxCount * 0.15)} streams`
                        : i === 2
                          ? `${Math.floor(data.maxCount * 0.15) + 1}-${Math.floor(data.maxCount * 0.4)} streams`
                          : i === 3
                            ? `${Math.floor(data.maxCount * 0.4) + 1}-${Math.floor(data.maxCount * 0.7)} streams`
                            : `${Math.floor(data.maxCount * 0.7) + 1}-${data.maxCount} streams`
                  }
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function prepareYearData(
  dailyCounts: {
    date: string;
    count: number;
  }[],
  year: number,
) {
  const dateMap = dailyCounts.reduce(
    (acc: Record<string, number>, { date, count }) => {
      acc[date] = count;
      return acc;
    },
    {},
  );

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const weeks = [];
  let currentWeek = [];

  const monthLengths = Array(12).fill(0);

  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() - currentDate.getDay());

  let totalStreams = 0;
  let maxDay = null;

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split("T")[0];
    const count = dateMap[dateString as string] || 0;

    currentWeek.push({
      date: dateString,
      count,
    });

    if (currentDate >= startDate && currentDate <= endDate) {
      const month = currentDate.getMonth();
      monthLengths[month]++;
      totalStreams += count;

      if (count > 0 && (!maxDay || count > maxDay.count)) {
        maxDay = { date: dateString, count };
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);

    if (currentDate.getDay() === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  for (let i = 0; i < monthLengths.length; i++) {
    monthLengths[i] = Math.ceil(monthLengths[i] / 7);
  }

  return {
    weeks,
    monthLengths,
    totalStreams,
    maxDay,
  };
}
