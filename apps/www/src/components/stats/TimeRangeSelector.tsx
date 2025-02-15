// components/stats/TimeRangeSelector.tsx
import type { TIME_RANGE } from "@/types/spotify";
import { TIME_RANGE_TEXT } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface TimeRangeSelectorProps {
  timeRange: TIME_RANGE;
  onTimeRangeChange: (value: TIME_RANGE) => Promise<void>;
  isLoading: boolean;
}

export function TimeRangeSelector({
  timeRange,
  onTimeRangeChange,
  isLoading,
}: TimeRangeSelectorProps) {
  return (
    <div className="flex justify-end">
      <Select
        onValueChange={onTimeRangeChange}
        value={timeRange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="short_term">
            Last {TIME_RANGE_TEXT.short_term}
          </SelectItem>
          <SelectItem value="medium_term">
            Last {TIME_RANGE_TEXT.medium_term}
          </SelectItem>
          <SelectItem value="long_term">
            Last {TIME_RANGE_TEXT.long_term}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
